import { describe, expect, it } from 'vitest';
import { parseShoppingList, shoppingInstructions } from './shoppingImport';

const categories = [{ id: 'produce', name: 'Produce' }, { id: 'coffee', name: 'Coffee & tea' }];

describe('clipboard shopping lists', () => {
  it('maps exact layout names to stable category IDs and preserves quantities', () => {
    expect(parseShoppingList('{"items":[{"item":"  Apples (3)  ","where":"Produce"},{"item":"Tea","where":"Coffee & tea"}]}', categories)).toEqual([
      { item: 'Apples (3)', categoryId: 'produce' }, { item: 'Tea', categoryId: 'coffee' },
    ]);
    expect(parseShoppingList('{"items":[]}', categories)).toEqual([]);
  });

  it('accepts copied code blocks with or without the JSON label', () => {
    const json = '{"items":[{"item":"Apples","where":"Produce"}]}';
    for (const label of ['json', '']) {
      expect(parseShoppingList('```' + label + '\n' + json + '\n```', categories)).toEqual([{ item: 'Apples', categoryId: 'produce' }]);
    }
    expect(() => parseShoppingList('Explanation\n```json\n' + json + '\n```', categories)).toThrow();
  });

  it.each([
    '', 'null', '[]', '{}', '{"items":{}}', '{"items":[null]}',
    '{"items":[{"item":"","where":"Produce"}]}',
    '{"items":[{"item":42,"where":"Produce"}]}',
    '{"items":[{"item":"Apples"}]}',
    '{"items":[{"item":"Apples","where":"produce"}]}',
    '{"items":[{"item":"Apples","where":"Bakery"}]}',
    '{"items":[{"item":"Apples","where":"Produce"},{"item":"Tea","where":"Unknown"}]}',
  ])('rejects invalid input without returning a partial list: %s', text => {
    expect(() => parseShoppingList(text, categories)).toThrow();
  });

  it('includes store layout and required output constraints in instructions', () => {
    const instructions = shoppingInstructions({ id: 'store', name: 'Whole Foods', categories });
    expect(instructions).toContain('Whole Foods');
    expect(instructions).toContain(JSON.stringify(categories.map(category => category.name)));
    expect(instructions).toContain('{"items":[{"item":"<item-name>","where":"<layout-name>"}]}');
    expect(instructions).toContain('must exactly match');
    expect(instructions).toContain('single fenced code block labeled json');
    expect(instructions).toContain('two-space indentation');
  });
});
