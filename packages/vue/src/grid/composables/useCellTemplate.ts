import type { HyperFunc, VNode } from '@revolist/revogrid';
import { VGridVueTemplateConstructor } from '@revolist/vue3-datagrid';
import { getCurrentInstance, onBeforeUnmount, type Component } from 'vue';

/** What a template reads from RevoGrid's cell / header props. */
type TemplateProps = { prop?: unknown; rowIndex?: unknown };

/**
 * A RevoGrid `cellTemplate` / `columnTemplate` rendering a Vue component.
 * Assignable to both (`CellTemplateProp` and `ColumnTemplateProp` fit
 * `TemplateProps`).
 */
export type GridVueTemplate = (
  h: HyperFunc<VNode>,
  props: TemplateProps,
  addition?: unknown,
) => VNode;

/**
 * Setup-bound `VGridVueTemplate`.
 *
 * RevoGrid renders each cell with `render()` into its own element, so a cell
 * only sees what the captured component instance's **app context** provides
 * (`app.provide`, i.e. `createWelldot` and PrimeVue) — never `provide()` of
 * an ancestor component. `VGridVueTemplate` captures that instance when it
 * is called, so calling it inside a `computed` that re-runs outside render
 * yields cells with no app context at all.
 *
 * Call this in `setup`: the returned factory carries the instance captured
 * there and can then be called anywhere (e.g. in a column `computed`). Extra
 * props are merged under the cell props RevoGrid passes (`value`, `model`,
 * `rowIndex`, `column`, …), exactly like `VGridVueTemplate`'s `customProps`.
 *
 * Every cell mounted through the factory is unmounted when the calling
 * component unmounts: RevoGrid only tears a cell down when it removes that
 * single cell, not when the whole grid goes away.
 */
export function useCellTemplate() {
  const instance = getCurrentInstance();
  /** Live cells, keyed by their host element, with their unmount. */
  const live = new Map<Element, () => void>();

  if (instance) {
    onBeforeUnmount(() => {
      for (const destroy of live.values()) destroy();
      live.clear();
    });
  }

  return function cellTemplate(
    component: Component,
    extraProps?: Record<string, unknown>,
  ): GridVueTemplate {
    return (h, props, addition) => {
      const merged: Record<string, unknown> = { ...extraProps, ...props };
      merged.addition = addition;
      let last: { destroy: () => void; el: Element | null } | null = null;
      return h('span', {
        key: `${String(props.prop)}-${Number(props.rowIndex) || 0}`,
        ref: (el: Element | null) => {
          const previous = last;
          last = VGridVueTemplateConstructor(
            component,
            el,
            merged,
            instance,
            last,
          );
          if (el) live.set(el, last.destroy);
          else if (previous?.el) live.delete(previous.el);
        },
      });
    };
  };
}
