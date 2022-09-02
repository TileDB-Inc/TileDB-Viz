import setSceneColors from './setSceneColors';

describe('setSceneColors', () => {
  it('returns light scene colors', () => {
    const colors = setSceneColors('light');
    expect(colors).toEqual({
      accentColor: '#352F4D',
      backgroundColor: {
        a: 1,
        b: 0.9803921568627451,
        g: 0.9686274509803922,
        r: 0.9607843137254902
      },
      secondColor: '#C7C7C7',
      textColor: '#352F4D'
    });
  });

  it('returns dark scene colors', () => {
    const colors = setSceneColors('dark');
    expect(colors).toEqual({
      accentColor: '#C7C7C7',
      backgroundColor: {
        a: 1,
        b: 0.10980392156862745,
        g: 0.10980392156862745,
        r: 0.10980392156862745
      },
      secondColor: '#F5F7FA',
      textColor: '#F5F7FA'
    });
  });
});
