/** Props for the <RowStyle> component. */
export interface RowStyleProps {
  /** Condition function — receives row data, returns true if style applies. */
  when: (row: Record<string, unknown>) => boolean;
  /** Background color when condition is true. */
  backgroundColor?: string;
  /** Text color when condition is true. */
  color?: string;
}

/**
 * Declarative row styling component.
 * Renders nothing — registers row style rules with the parent Grid.
 */
export function RowStyle(_props: RowStyleProps): null {
  // TODO: register row style rule with Grid context on mount,
  // unregister on unmount.
  return null;
}
