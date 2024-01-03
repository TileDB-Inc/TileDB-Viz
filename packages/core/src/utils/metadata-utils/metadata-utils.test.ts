import { tileDBUriParser } from './metadata-utils';

describe('tileDBUriParser', () => {
  it('TileDB Uri', () => {
    const { namespace, id } = tileDBUriParser(
      'tiledb://namespace/85da399c-26c9-1d3e-1391-4278a76d59fa',
      'fallback'
    );
    expect(namespace).toBe('namespace');
    expect(id).toBe('85da399c-26c9-1d3e-1391-4278a76d59fa');
  });

  it('TileDB ID with fallback', () => {
    const { namespace, id } = tileDBUriParser(
      '85da399c-26c9-1d3e-1391-4278a76d59fa',
      'fallback'
    );
    expect(namespace).toBe('fallback');
    expect(id).toBe('85da399c-26c9-1d3e-1391-4278a76d59fa');
  });

  it('Invalid uri', () => {
    expect(() => {
      tileDBUriParser(
        's3://namespace/85da399c-26c9-1d3e-1391-4278a76d59fa',
        'fallback'
      );
    }).toThrow(Error);
  });
});
