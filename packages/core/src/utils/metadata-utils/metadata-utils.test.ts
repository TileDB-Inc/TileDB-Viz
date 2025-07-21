import { tileDBUriParser } from './metadata-utils';

describe('tileDBUriParser', () => {
  it('TileDB Uri', () => {
    const { workspace, teamspace, id } = tileDBUriParser(
      'tiledb://ws_demo/ts_demo/85da399c-26c9-1d3e-1391-4278a76d59fa',
      'ws_demo',
      'ts_demo'
    );
    expect(workspace).toBe('ws_demo');
    expect(teamspace).toBe('ts_demo');
    expect(id).toBe('85da399c-26c9-1d3e-1391-4278a76d59fa');
  });

  it('TileDB ID with fallback', () => {
    const { workspace, teamspace, id } = tileDBUriParser(
      '85da399c-26c9-1d3e-1391-4278a76d59fa',
      'ws_demo',
      'ts_demo'
    );
    expect(workspace).toBe('ws_demo');
    expect(teamspace).toBe('ts_demo');
    expect(id).toBe('85da399c-26c9-1d3e-1391-4278a76d59fa');
  });

  it('Invalid uri', () => {
    expect(() => {
      tileDBUriParser(
        's3://namespace/85da399c-26c9-1d3e-1391-4278a76d59fa',
        'ws_demo',
        'ts_demo'
      );
    }).toThrow(Error);
  });
});
