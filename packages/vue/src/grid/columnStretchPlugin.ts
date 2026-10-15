import type { ColumnProp, DimensionCols, GridPlugin } from '@revolist/revogrid';
import type { PluginProviders } from '@revolist/vue3-datagrid';
import { BasePlugin } from '@revolist/vue3-datagrid';

const FALLBACK_MIN_SIZE = 50;
const DEFAULT_COL_SIZE = 150;

/**
 * Factory that returns a RevoGrid plugin class whose instance keeps one
 * column filling all horizontal space left over by the other columns.
 *
 * `WellDataGrid` applies it to the column flagged `stretch: true`.
 *
 * Usage:
 *   plugins: [columnStretchPlugin('myProp', 120)]
 */
export function columnStretchPlugin(
  stretchProp: ColumnProp,
  minSize = FALLBACK_MIN_SIZE,
): GridPlugin {
  return class extends BasePlugin {
    private ro: ResizeObserver;
    private raf: number | null = null;

    constructor(el: HTMLRevoGridElement, providers: PluginProviders) {
      super(el, providers);

      this.ro = new ResizeObserver(() => this.schedule());
      this.ro.observe(el);

      this.addEventListener('aftergridinit', () => this.schedule());
      this.addEventListener('aftercolumnsset', () => this.schedule());
      this.addEventListener('aftercolumnresize', () => this.schedule());
    }

    private schedule() {
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => {
        this.raf = null;
        this.recalc();
      });
    }

    private recalc() {
      const gridWidth = this.revogrid.clientWidth;
      if (!gridWidth) return;

      const all = this.providers.column.getColumns('all');
      const target = all.find(c => c.prop === stretchProp);
      if (!target) return;

      const otherWidth = all
        .filter(c => c.prop !== stretchProp)
        .reduce((sum, c) => sum + (c.size ?? DEFAULT_COL_SIZE), 0);

      const newSize = Math.max(minSize, gridWidth - otherWidth);
      if (newSize === target.size) return;

      const type = (target.pin ?? 'rgCol') as DimensionCols;
      const idx = this.providers.column.getColumnIndexByProp(stretchProp, type);
      if (idx < 0) return;

      // Update column metadata in the column store
      this.providers.column.updateColumn({ ...target, size: newSize }, idx);
      // Update visual width in the dimension store (this is what actually moves pixels)
      this.providers.dimension.setCustomSizes(type, { [idx]: newSize }, true);
    }

    destroy() {
      this.ro.disconnect();
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      super.destroy();
    }
  };
}
