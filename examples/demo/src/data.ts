const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Marketing",
  "Sales", "HR", "Finance", "Operations",
];

const TITLES = [
  "Junior Engineer", "Senior Engineer", "Staff Engineer", "Principal Engineer",
  "Engineering Manager", "Product Manager", "Designer", "Marketing Lead",
  "Sales Rep", "HR Specialist", "Accountant", "Ops Manager",
];

const FIRST_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank",
  "Ivy", "Jack", "Karen", "Leo", "Mia", "Noah", "Olivia", "Paul",
  "Quinn", "Ruby", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xander",
  "Yuki", "Zara",
];

const LAST_NAMES = [
  "Kim", "Lee", "Park", "Choi", "Jung", "Smith", "Johnson", "Williams",
  "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Tanaka", "Sato", "Suzuki", "Takahashi", "Watanabe",
];

export function generateEmployees(count: number): Record<string, unknown>[] {
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  };
  const rand = rng(42);

  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]!;
    const lastName = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]!;
    const dept = DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)]!;
    const year = 2015 + Math.floor(rand() * 10);
    const month = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");

    return {
      id: i + 1,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      department: dept,
      title: TITLES[Math.floor(rand() * TITLES.length)]!,
      salary: 40000 + Math.floor(rand() * 160000),
      startDate: `${year}-${month}-${day}`,
      isActive: rand() > 0.15,
      performanceScore: rand() > 0.1 ? Math.round(rand() * 50 + 50) : null,
      teamSize: 1 + Math.floor(rand() * 20),
    };
  });
}

/** Small dataset for layout demos (8 rows). */
export function generateSmallData(): Record<string, unknown>[] {
  return [
    { name: "Alice Kim", dept: "Engineering", salary: 95000, score: 88 },
    { name: "Bob Lee", dept: "Product", salary: 87000, score: 92 },
    { name: "Charlie Park", dept: "Design", salary: 78000, score: 75 },
    { name: "Diana Choi", dept: "Marketing", salary: 82000, score: 81 },
    { name: "Eve Smith", dept: "Sales", salary: 91000, score: 95 },
    { name: "Frank Brown", dept: "HR", salary: 73000, score: 70 },
    { name: "Grace Jones", dept: "Finance", salary: 88000, score: 86 },
    { name: "Hank Garcia", dept: "Ops", salary: 76000, score: 79 },
  ];
}
