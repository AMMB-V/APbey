import { expect, it } from 'vitest';
import { csvRows, rosterNames } from './rosterImport';

it('recovers names from exported rosters with quoted delimiters and escaped quotes', () => {
  expect(rosterNames(csvRows('Siembra,Nombre\r\n1,"A, B"\r\n2,"Team ""X"""'))).toEqual(['A, B', 'Team "X"']);
});

it('rejects ambiguous columns and incomplete records before import', () => {
  expect(() => rosterNames(csvRows('1,A\n2,B'))).toThrow('Nombre');
  expect(() => csvRows('Nombre\n"A')).toThrow('comilla');
});
