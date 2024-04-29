import proj4 from 'proj4';

export abstract class BaseProjection {
  protected projection: proj4.InterfaceProjection;

  constructor(projection: proj4.InterfaceProjection) {
    this.projection = projection;
  }

  public abstract getName(): string;

  public abstract getDependencies(): string[];

  public abstract getForwardSource(suffix: string): string;

  public abstract getInverseSource(suffix: string): string;
}
