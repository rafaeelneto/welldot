import React from 'react';
import { Table } from '@mantine/core';

import { PROFILE_TYPE } from '../../types/profile.types';

import {
  numberFormater,
  numberFormaterInches,
  calculateHoleFillVolume,
} from '../../utils/profile.utils';

import styles from './info.module.scss';

type InfoProps = {
  profile: PROFILE_TYPE;
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
  const tables: TableType[] = [];

  if (profile.constructive.bore_hole.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Furo',
      header: [
        { text: 'Diamêtro' },
        { text: 'De (m)', align: 'right' },
        { text: 'Até (m)', align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.constructive.bore_hole.length; i++) {
      const item = profile.constructive.bore_hole[i];

      rows.push([
        { text: `${numberFormaterInches.format(item.diam_pol)}"` },
        { text: `${numberFormater.format(item.from)}`, align: 'right' },
        { text: `${numberFormater.format(item.to)}`, align: 'right' },
      ]);
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.constructive.surface_case.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Tubo de Boca',
      header: [
        { text: 'Diamêtro' },
        { text: 'De (m)', align: 'right' },
        { text: 'Até (m)', align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.constructive.surface_case.length; i++) {
      const item = profile.constructive.surface_case[i];

      rows.push([
        { text: `${numberFormaterInches.format(item.diam_pol)}"` },
        { text: `${numberFormater.format(item.from)}`, align: 'right' },
        { text: `${numberFormater.format(item.to)}`, align: 'right' },
      ]);
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.constructive.hole_fill.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Espaço Anelar',
      header: [
        { text: 'Descrição' },
        { text: 'Diamêtro', align: 'right' },
        { text: 'De (m)', align: 'right' },
        { text: 'Até (m)', align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.constructive.hole_fill.length; i++) {
      const item = profile.constructive.hole_fill[i];

      rows.push([
        {
          text: `${item.description ? item.description : item.type}`,
        },
        {
          text: `${numberFormaterInches.format(item.diam_pol)}"`,
          align: 'right',
        },
        { text: `${numberFormater.format(item.from)}`, align: 'right' },
        { text: `${numberFormater.format(item.to)}`, align: 'right' },
      ]);

      if (
        item.type !== profile.constructive.hole_fill[i + 1]?.type ||
        i === profile.constructive.hole_fill.length - 1
      ) {
        rows.push([
          { text: `Volume total`, classStyle: styles.sumCell, colSpan: 3 },
          {
            text: `${numberFormater.format(
              calculateHoleFillVolume(item.type, profile),
            )} m³`,
            classStyle: styles.sumCell,
            align: 'right',
          },
        ]);
      }
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.constructive.well_case.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Revestimento',
      header: [
        { text: 'Tipo' },
        { text: 'Diamêtro', align: 'right' },
        { text: 'De (m)', align: 'right' },
        { text: 'Até (m)', align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.constructive.well_case.length; i++) {
      const item = profile.constructive.well_case[i];

      rows.push([
        {
          text: `${item.type}`,
        },
        {
          text: `${numberFormaterInches.format(item.diam_pol)}"`,
          align: 'right',
        },
        { text: `${numberFormater.format(item.from)}`, align: 'right' },
        { text: `${numberFormater.format(item.to)}`, align: 'right' },
      ]);

      if (
        item.type !== profile.constructive.well_case[i + 1]?.type ||
        item.diam_pol !== profile.constructive.well_case[i + 1]?.diam_pol
      ) {
        let totalHeight = 0;
        const filteredWC = profile.constructive.well_case.filter(
          el => el.type === item.type && el.diam_pol === item.diam_pol,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        rows.push([
          { text: `Total`, classStyle: styles.sumCell, colSpan: 3 },
          {
            text: `${numberFormater.format(totalHeight)} m`,
            classStyle: styles.sumCell,
            align: 'right',
          },
        ]);
      }
    }

    table.rows = rows;

    tables.push(table);
  }

  if (profile.constructive.well_screen.length > 0) {
    // @ts-ignore
    const table: TableType = {
      title: 'Filtros',
      header: [
        { text: 'Tipo' },
        { text: 'Diamêtro', align: 'right' },
        { text: 'Ranhura (mm)', align: 'right' },
        { text: 'De (m)', align: 'right' },
        { text: 'Até (m)', align: 'right' },
      ],
    };

    const rows: RowType[][] = [];

    for (let i = 0; i < profile.constructive.well_screen.length; i++) {
      const item = profile.constructive.well_screen[i];

      rows.push([
        {
          text: `${item.type}`,
        },
        {
          text: `${numberFormaterInches.format(item.diam_pol)}"`,
          align: 'right',
        },
        {
          text: `${numberFormater.format(item.screen_slot_mm)}`,
          align: 'right',
        },
        { text: `${numberFormater.format(item.from)}`, align: 'right' },
        { text: `${numberFormater.format(item.to)}`, align: 'right' },
      ]);

      if (
        item.type !== profile.constructive.well_screen[i + 1]?.type ||
        item.diam_pol !== profile.constructive.well_screen[i + 1]?.diam_pol
      ) {
        let totalHeight = 0;
        const filteredWC = profile.constructive.well_screen.filter(
          el => el.type === item.type && el.diam_pol === item.diam_pol,
        );

        filteredWC.forEach(el => {
          totalHeight += el.to - el.from;
        });

        rows.push([
          { text: `Total`, classStyle: styles.sumCell, colSpan: 4 },
          {
            text: `${numberFormater.format(totalHeight)} m`,
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
