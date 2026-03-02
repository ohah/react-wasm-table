# Streaming Data Phase 2 — WASM Incremental Append 구현 계획

> **상태: ✅ 구현 완료**
>
> **목표:** 매 data append마다 전체 데이터를 WASM에 재적재하는 O(n×columns) 병목 제거.
> 새로 추가된 행만 WASM에 전달하여 O(delta×columns)로 개선.
>
> **전제:** Phase 1의 `totalCount` / `onFetchMore` / `fetchAhead` API는 그대로 유지.
> 사용자 코드 변경 없이 내부 최적화만 수행.

---

## 현재 상태 (Phase 1 병목)

```
data append (200행 추가)
    ↓
setData(prev => [...prev, ...newRows])   ← React 새 배열 생성
    ↓
useEffect → ingestData(engine, data, columnIds)
    ↓
engine.initColumnar(colCount, data.length)  ← 기존 데이터 전부 삭제
    ↓
for each column:
    buildFloat64Column(data, colId)    ← 전체 data 순회 (O(n))
    engine.ingestFloat64Column(...)    ← 전체 Vec 복사 (O(n))
    ↓
engine.finalizeColumnar()              ← view_dirty = true
    ↓
rebuild_view()                         ← 전체 indices 재생성 (O(n))
```

**성능 영향:**

| 누적 행 수 | columns=10 | 현재 비용 (전체 재적재)       | Phase 2 목표 (append)       |
| ---------- | ---------- | ----------------------------- | --------------------------- |
| 1,000      | 10         | ~10,000 iter + 10 Vec copy    | ~2,000 iter + 10 Vec extend |
| 10,000     | 10         | ~100,000 iter + 10 Vec copy   | ~2,000 iter + 10 Vec extend |
| 100,000    | 10         | ~1,000,000 iter + 10 Vec copy | ~2,000 iter + 10 Vec extend |

---

## 핵심 설계 결정

### 1. `init` vs `append` 분기 기준

- **첫 로딩 / 컬럼 변경 / data 축소**: 기존 `initColumnar` + 전체 재적재
- **data.length 증가 (streaming append)**: 새 `appendColumnar` 경로

TS에서 `prevDataLenRef`로 판단:

```typescript
if (prevDataLen > 0 && data.length > prevDataLen && columnsUnchanged) {
  appendData(engine, data, columnIds, prevDataLen); // 증분
} else {
  ingestData(engine, data, columnIds); // 전체
}
```

### 2. String Intern Table 병합 전략

String 컬럼이 가장 복잡한 부분. 두 가지 선택지:

**Option A: WASM 측 병합 (선택)**

- TS는 새 행만 대상으로 `buildStringColumn()` 호출 → `[unique, ids]` 생성
- WASM의 `append_string_column()`이 새 unique strings를 기존 intern table에 병합
- 이미 존재하는 문자열은 기존 ID 재사용 (intern() 함수가 자동 처리)
- 새 행의 ids는 WASM에서 리매핑 (TS측 로컬 ID → 글로벌 intern ID)

**Option B: TS 측 글로벌 intern table 관리 (기각)**

- TS가 글로벌 intern lookup을 유지하면 WASM과 동기화 문제 발생
- TS/WASM 양측에 중복 상태 → 복잡도 증가

### 3. rebuild_view는 여전히 필요

Append 후에도 정렬/필터 인덱스는 **전체 재계산** 필요:

- 새 행이 정렬 순서 어디에 위치하는지 결정 불가 (incremental sort 불가)
- 새 행이 필터를 통과하는지 평가 필요
- `rebuild_view()`는 이미 `view_dirty` 플래그로 lazy 실행

**다만**, streaming 모드에서는 보통 서버 사이드 정렬/필터를 전제하므로
클라이언트 정렬/필터가 없으면 `rebuild_view()`는 단순 `(0..row_count).collect()` → O(n) 여전히.
이것은 Phase 3에서 incremental index 패치로 최적화 가능.

---

## 구현 단계

### Step 2-1. Rust: ColumnarStore append 메서드 추가

**파일: `crates/core/src/columnar_store.rs`**

```rust
impl ColumnarStore {
    /// Prepare for appending `new_rows` rows. Does NOT reset existing data.
    /// Pre-extends all column Vecs and updates row_count.
    pub fn begin_append(&mut self, new_rows: usize) {
        let old_count = self.row_count;
        let new_count = old_count + new_rows;

        for col in &mut self.data {
            match col {
                ColumnData::Float64(v) | ColumnData::Bool(v) => {
                    v.resize(new_count, f64::NAN);
                }
                ColumnData::Strings { ids, .. } => {
                    ids.resize(new_count, 0);
                }
            }
        }

        self.row_count = new_count;
        self.generation += 1;
    }

    /// Append Float64 values starting at `offset`.
    pub fn append_column_float64(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        if let Some(ColumnData::Float64(v)) = self.data.get_mut(col_idx) {
            let end = (offset + values.len()).min(v.len());
            v[offset..end].copy_from_slice(&values[..end - offset]);
        }
    }

    /// Append Bool values (as f64) starting at `offset`.
    pub fn append_column_bool(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        if let Some(ColumnData::Bool(v)) = self.data.get_mut(col_idx) {
            let end = (offset + values.len()).min(v.len());
            v[offset..end].copy_from_slice(&values[..end - offset]);
        }
    }

    /// Append string column: merge new unique strings into existing intern table,
    /// remap IDs, and write starting at `offset`.
    pub fn append_column_strings(
        &mut self,
        col_idx: usize,
        offset: usize,
        new_unique: &[String],
        new_ids: &[u32],
    ) {
        if let Some(ColumnData::Strings { ids, intern }) = self.data.get_mut(col_idx) {
            // Build local-ID → global-ID mapping
            let mut id_map: Vec<u32> = Vec::with_capacity(new_unique.len());
            for s in new_unique {
                id_map.push(intern.intern(s));  // 기존 문자열이면 기존 ID 반환
            }

            // Remap and write
            let end = (offset + new_ids.len()).min(ids.len());
            for (i, &local_id) in new_ids[..end - offset].iter().enumerate() {
                ids[offset + i] = id_map[local_id as usize];
            }
        }
    }

    /// Finalize append. Same as finalize() — marks view dirty.
    pub fn finalize_append(&mut self) {
        self.view_dirty = true;
    }
}
```

**테스트 (columnar_store 기존 테스트 파일에 추가):**

- `begin_append`이 기존 데이터 보존하고 Vec 확장
- `append_column_float64`이 offset부터 값 기록
- `append_column_strings`가 intern table 병합 + ID 리매핑
- append 후 `rebuild_view()` 정상 동작 (filter/sort 포함)
- generation 증가 확인

### Step 2-2. WASM 바인딩 추가

**파일: `crates/wasm/src/lib.rs`**

```rust
#[wasm_bindgen]
impl TableEngine {
    /// Begin appending rows (does not clear existing data).
    #[wasm_bindgen(js_name = beginAppendColumnar)]
    pub fn begin_append_columnar(&mut self, new_row_count: usize) {
        self.columnar.begin_append(new_row_count);
    }

    /// Append Float64 values starting at offset.
    #[wasm_bindgen(js_name = appendFloat64Column)]
    pub fn append_float64_column(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        self.columnar.append_column_float64(col_idx, offset, values);
    }

    /// Append Bool values (as f64) starting at offset.
    #[wasm_bindgen(js_name = appendBoolColumn)]
    pub fn append_bool_column(&mut self, col_idx: usize, offset: usize, values: &[f64]) {
        self.columnar.append_column_bool(col_idx, offset, values);
    }

    /// Append String column with intern table merge.
    #[wasm_bindgen(js_name = appendStringColumn)]
    pub fn append_string_column(
        &mut self,
        col_idx: usize,
        offset: usize,
        unique_strings: JsValue,
        ids: &[u32],
    ) -> Result<(), JsError> {
        let unique: Vec<String> = serde_wasm_bindgen::from_value(unique_strings)?;
        self.columnar.append_column_strings(col_idx, offset, &unique, ids);
        Ok(())
    }

    /// Finalize append (marks view dirty).
    #[wasm_bindgen(js_name = finalizeAppendColumnar)]
    pub fn finalize_append_columnar(&mut self) {
        self.columnar.finalize_append();
    }
}
```

### Step 2-3. TS 타입 + appendData 함수

**파일: `packages/grid/src/types.ts`** — WasmTableEngine 인터페이스 확장

```typescript
// Streaming append (Phase 2)
beginAppendColumnar(newRowCount: number): void;
appendFloat64Column(colIdx: number, offset: number, values: Float64Array): void;
appendBoolColumn(colIdx: number, offset: number, values: Float64Array): void;
appendStringColumn(colIdx: number, offset: number, uniqueStrings: string[], ids: Uint32Array): void;
finalizeAppendColumnar(): void;
```

**파일: `packages/grid/src/adapter/data-ingestor.ts`** — appendData 함수 추가

```typescript
/**
 * Incremental append: only process rows from startIndex onward.
 * Requires WASM beginAppendColumnar / append*Column / finalizeAppendColumnar.
 */
export function appendData(
  engine: WasmTableEngine,
  data: Record<string, unknown>[],
  columnIds: string[],
  startIndex: number,
): void {
  const newCount = data.length - startIndex;
  if (newCount <= 0) return;

  // Slice only new rows for type classification
  const newRows = data.slice(startIndex);
  const types = classifyColumns(newRows, columnIds);

  engine.beginAppendColumnar(newCount);

  for (let i = 0; i < columnIds.length; i++) {
    const colId = columnIds[i]!;
    switch (types[i]) {
      case "float64": {
        const values = buildFloat64Column(newRows, colId);
        engine.appendFloat64Column(i, startIndex, values);
        break;
      }
      case "bool": {
        const values = buildBoolColumn(newRows, colId);
        engine.appendBoolColumn(i, startIndex, values);
        break;
      }
      case "string": {
        const [unique, ids] = buildStringColumn(newRows, colId);
        engine.appendStringColumn(i, startIndex, unique, ids);
        break;
      }
    }
  }

  engine.finalizeAppendColumnar();
}
```

### Step 2-4. useDataIngestion append 분기

**파일: `packages/grid/src/react/hooks/use-data-ingestion.ts`**

```typescript
import { ingestData, appendData } from "../../adapter/data-ingestor";

// 기존:
ingestData(engine, data, columnIds);

// 변경:
const isAppend =
  prevDataLenRef.current > 0 &&
  data.length > prevDataLenRef.current &&
  columnIds.join("\0") === prevColumnKeyRef.current;

if (isAppend) {
  appendData(engine, data, columnIds, prevDataLenRef.current);
} else {
  ingestData(engine, data, columnIds);
}
```

핵심: 컬럼 구성이 변경되면 전체 재적재, data 증가만이면 append.

### Step 2-5. WASM 빌드 + TS 타입 갱신

```bash
# Rust 빌드
cd crates/wasm && wasm-pack build --target web

# TS 빌드
cd packages/grid && bun run build
```

---

## 변경 파일 목록

| 파일                                                  | 유형 | 변경 내용                                              |
| ----------------------------------------------------- | ---- | ------------------------------------------------------ |
| `crates/core/src/columnar_store.rs`                   | 수정 | begin*append, append_column*\*, finalize_append 메서드 |
| `crates/wasm/src/lib.rs`                              | 수정 | WASM 바인딩 5개 추가                                   |
| `packages/grid/src/types.ts`                          | 수정 | WasmTableEngine에 append 메서드 타입 추가              |
| `packages/grid/src/adapter/data-ingestor.ts`          | 수정 | appendData() 함수 추가                                 |
| `packages/grid/src/react/hooks/use-data-ingestion.ts` | 수정 | append/ingest 분기 로직                                |

---

## 테스트 계획

### Rust 테스트 (`crates/core/src/columnar_store.rs`)

| 테스트                                   | 검증 내용                                              |
| ---------------------------------------- | ------------------------------------------------------ |
| `append_preserves_existing_float64`      | begin_append 후 기존 Float64 데이터 유지               |
| `append_preserves_existing_strings`      | begin_append 후 기존 String 데이터 + intern table 유지 |
| `append_float64_column_writes_at_offset` | offset 위치에 새 값 기록                               |
| `append_bool_column_writes_at_offset`    | Bool 컬럼 append                                       |
| `append_string_column_merges_intern`     | 기존 문자열 ID 재사용, 새 문자열 추가                  |
| `append_string_remap_ids`                | 로컬 ID → 글로벌 ID 리매핑 정확성                      |
| `append_then_filter`                     | append 후 filter 정상 동작                             |
| `append_then_sort`                       | append 후 sort 정상 동작                               |
| `append_increments_generation`           | generation 카운터 증가 확인                            |
| `append_marks_view_dirty`                | finalize_append 후 view_dirty 확인                     |

### TS 테스트 (`packages/grid/src/adapter/__tests__/data-ingestor.test.ts`)

| 테스트                                                    | 검증 내용                          |
| --------------------------------------------------------- | ---------------------------------- |
| `appendData processes only new rows`                      | startIndex 이후만 typed array 생성 |
| `appendData calls beginAppendColumnar with correct count` | newCount 정확성                    |
| `appendData handles string columns`                       | unique + ids 생성 및 전달          |
| `appendData no-op when startIndex >= data.length`         | 빈 append 방어                     |

### 통합 테스트 (`packages/grid/src/react/__tests__/use-data-ingestion.test.ts`)

| 테스트                                | 검증 내용                                  |
| ------------------------------------- | ------------------------------------------ |
| `uses appendData when data grows`     | prevDataLen < data.length일 때 append 경로 |
| `uses ingestData when columns change` | 컬럼 변경 시 전체 재적재                   |
| `uses ingestData when data shrinks`   | data 축소 시 전체 재적재                   |

---

## 예상 성능 개선

### TS 측 (TypedArray 생성)

현재: `buildFloat64Column(allData, colId)` — 전체 배열 순회
개선: `buildFloat64Column(newRows, colId)` — 새 행만 순회

| 시나리오                       | 현재                               | Phase 2                        | 개선                        |
| ------------------------------ | ---------------------------------- | ------------------------------ | --------------------------- |
| 50K rows + 200 append, 10 cols | 500K iter + 10 Float64Array(50200) | 2K iter + 10 Float64Array(200) | **250x iter, ~250x 메모리** |

### WASM 측 (Vec 복사)

현재: `values.to_vec()` — 전체 배열 복사
개선: `v[offset..end].copy_from_slice()` — 새 부분만 기록

| 시나리오                       | 현재 copy             | Phase 2 copy         | 개선     |
| ------------------------------ | --------------------- | -------------------- | -------- |
| 50K rows + 200 append, 10 cols | 10 × 50200 × 8B = 4MB | 10 × 200 × 8B = 16KB | **250x** |

### rebuild_view (변경 없음)

`rebuild_view()`는 여전히 O(n) — 전체 indices 재생성.
정렬/필터 없는 streaming에서는 `(0..row_count).collect()` 만 수행.
Phase 3에서 incremental index 패치로 추가 최적화 가능.

---

## 리스크 및 고려사항

### 1. WASM 바이너리 크기 증가

- 5개 함수 추가 → 예상 ~500B~1KB wasm 바이너리 증가 (무시 가능)

### 2. String Intern Table 메모리 누적

- Append 모드에서 intern table은 계속 성장
- 삭제된 문자열의 intern 엔트리는 남아있음 (GC 없음)
- 100만 행 × 10개 고유 문자열/컬럼 수준에서는 문제 없음
- 극단적 경우 (수백만 고유 문자열) 대비 → Phase 3에서 intern GC 고려

### 3. data 참조 안정성

- `setData(prev => [...prev, ...newRows])` 패턴은 매번 새 배열 생성
- TS의 `data.slice(startIndex)` 도 복사 비용 발생
- 이건 React 패턴의 한계 — 별도 최적화 필요하면 `useRef` 기반 mutable 패턴 고려
  (하지만 React 외부에서 mutate하면 re-render 트리거 불가 → trade-off)

### 4. append/ingest 분기 판단 오류

- 컬럼 순서 변경 없이 data만 성장해도 타입이 바뀔 수 있음
  (예: 첫 batch에서 null-only 컬럼 → string, 두 번째 batch에서 number)
- `classifyColumns`를 새 행 기준으로 하면 기존 컬럼 타입과 불일치
- **해결:** `classifyColumns`는 전체 data에서 첫 non-null 값으로 판단 (현재 동작 유지)
  → append 시에도 기존 타입 체계 참조 필요
  → `prevColumnTypes` 캐시 추가

---

## Phase 3 (후속 — 이번 범위 아님)

- **Incremental index patch**: append 시 새 행만 filter 평가 → 기존 view_indices에 삽입
- **Intern table GC**: 참조 카운트 기반 미사용 intern 엔트리 정리
- **Random access / Sparse data**: 임의 위치 점프, 미로드 구간 placeholder
- **Server-side filter/sort 제약 모드**: streaming + 클라이언트 필터/정렬 비활성화 옵션
