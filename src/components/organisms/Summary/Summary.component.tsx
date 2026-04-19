import React from 'react';
import { Table } from '@mantine/core';

import { Well } from '@/src/lib/@types/well.types';

import {
  numberFormater,
  calculateHoleFillVolume,
} from '@/src/lib/utils/well.utils';

import { useUIStore } from '@/src/store/ui.store';

import styles from './Summary.module.scss';

type InfoProps = {
  profile: Well;
};

type RowType = {
  text: string;
  align?: string;
  colSpan?: number;
  classStyle?: string;
};

type TableType = {
  title: string;
  header: RowType[];
  rows: RowType[][];
};

function Info({ profile }: InfoProps) {
  const { diameter_units, length_units } = useUIStore();

  const fmtDiam = (mm: number) =>
    diameter_units === 'inches'
      ? `${numberFormater.format(parseFloat((mm / 25.4).toFixed(3)))} pol`
      : `${numberFormater.format(mm)} mm`;

  const fmtLen = (m: number) =>
    length_units === 'ft'
      ? numberFormater.format(parseFloat((m * 3.28084).toFixed(3)))
      : numberFormater.format(m);

  const lenLabel = length_units === 'ft' ? 'ft' : 'm';

  const tables: TableType[] = [];

  if (profile.bore_hole.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Furo',
      header: [
        { text: 'Diamêtro' },
        { text: `De (${lenLabel})`, align: 'right' },
        { text: `Até (${lenLabel})`, align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.bore_hole.length; i++) {
      const item = profile.bore_hole[i];

      rows.push([
        { text: fmtDiam(item.diameter) },
        { text: fmtLen(item.from), align: 'right' },
        { text: fmtLen(item.to), align: 'right' },
      ]);
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.surface_case.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Tubo de Boca',
      header: [
        { text: 'Diamêtro' },
        { text: `De (${lenLabel})`, align: 'right' },
        { text: `Até (${lenLabel})`, align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.surface_case.length; i++) {
      const item = profile.surface_case[i];

      rows.push([
        { text: fmtDiam(item.diameter) },
        { text: fmtLen(item.from), align: 'right' },
        { text: fmtLen(item.to), align: 'right' },
      ]);
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.hole_fill.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Espaço Anular',
      header: [
        { text: 'Descrição' },
        { text: 'Diamêtro', align: 'right' },
        { text: `De (${lenLabel})`, align: 'right' },
        { text: `Até (${lenLabel})`, align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.hole_fill.length; i++) {
      const item = profile.hole_fill[i];

      rows.push([
        {
          text: `${item.description ? item.description : item.type}`,
        },
        {
          text: fmtDiam(item.diameter),
          align: 'right',
        },
        { text: fmtLen(item.from), align: 'right' },
        { text: fmtLen(item.to), align: 'right' },
      ]);

      if (
        item.type !== profile.hole_fill[i + 1]?.type ||
        i === profile.hole_fill.length - 1
      ) {
        rows.push([
          { text: `Volume total`, classStyle: styles.sumCell, colSpan: 3 },
          {
            text: (() => {
              const volM3 = calculateHoleFillVolume(item.type, profile);
              return length_units === 'ft'
                ? `${numberFormater.format(parseFloat((volM3 * 35.3147).toFixed(3)))} ft³`
                : `${numberFormater.format(volM3)} m³`;
            })(),
            classStyle: styles.sumCell,
            align: 'right',
          },
        ]);
      }
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.well_case.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Revestimento',
      header: [
        { text: 'Tipo' },
        { text: 'Diamêtro', align: 'right' },
        { text: `De (${lenLabel})`, align: 'right' },
        { text: `Até (${lenLabel})`, align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.well_case.length; i++) {
      const item = profile.well_case[i];

      rows.push([
        {
          text: `${item.type}`,
        },
        {
          text: fmtDiam(item.diameter),
          align: 'right',
        },
        { text: fmtLen(item.from), align: 'right' },
        { text: fmtLen(item.to), align: 'right' },
      ]);

      if (
        item.type !== profile.well_case[i + 1]?.type ||
        item.diameter !== profile.well_case[i + 1]?.diameter
      ) {
        let totalHeight = 0;
        const filteredWC = profile.well_case.filter(
          el => el.type === item.type && el.diameter === item.diameter,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        rows.push([
          { text: `Total`, classStyle: styles.sumCell, colSpan: 3 },
          {
            text: `${fmtLen(totalHeight)} ${lenLabel}`,
            classStyle: styles.sumCell,
            align: 'right',
          },
        ]);
      }
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.well_screen.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Filtros',
      header: [
        { text: 'Tipo' },
        { text: 'Diamêtro', align: 'right' },
        { text: 'Ranhura (mm)', align: 'right' },
        { text: `De (${lenLabel})`, align: 'right' },
        { text: `Até (${lenLabel})`, align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.well_screen.length; i++) {
      const item = profile.well_screen[i];

      rows.push([
        {
          text: `${item.type}`,
        },
        {
          text: fmtDiam(item.diameter),
          align: 'right',
        },
        {
          text: `${numberFormater.format(item.screen_slot_mm)}`,
          align: 'right',
        },
        { text: fmtLen(item.from), align: 'right' },
        { text: fmtLen(item.to), align: 'right' },
      ]);

      if (
        item.type !== profile.well_screen[i + 1]?.type ||
        item.diameter !== profile.well_screen[i + 1]?.diameter
      ) {
        let totalHeight = 0;
        const filteredWC = profile.well_screen.filter(
          el => el.type === item.type && el.diameter === item.diameter,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        rows.push([
          { text: `Total`, classStyle: styles.sumCell, colSpan: 4 },
          {
            text: `${fmtLen(totalHeight)} ${lenLabel}`,
            classStyle: styles.sumCell,
            align: 'right',
          },
        ]);
      }
    }

    table.rows = rows;

    tables.push(table);
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      {tables.map(table => {
        return (
          <div key={table.title} className={styles.tableContainer}>
            <h3 className={styles.tableTitle}>{table.title}</h3>
            <Table className={styles.table} aria-label="simple table">
              <Table.Thead>
                <Table.Tr className={styles.header}>
                  {table.header.map(cell => {
                    return (
                      <Table.Th
                        key={cell.text}
                        className={styles.headerCell}
                        // @ts-ignore
                        align={cell.align || undefined}
                        colSpan={cell.colSpan}
                      >
                        {cell.text}
                      </Table.Th>
                    );
                  })}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody className={styles.tableBody}>
                {table.rows.map((row, index) => (
                  <Table.Tr
                    className={styles.tableRow}
                    key={index}
                    // sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    {row.map(cell => {
                      return (
                        <Table.Th
                          key={cell.text}
                          className={cell.classStyle}
                          // @ts-ignore
                          align={cell.align || undefined}
                          colSpan={cell.colSpan}
                        >
                          {cell.text}
                        </Table.Th>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}

export default Info;
