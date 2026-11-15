import { Switch } from './controls';

describe('accessible controls', () => {
  it('labels and wires the biometric session switch', () => {
    const change=jest.fn();
    const element=Switch({label:'Use biometrics to unlock PEPSA',value:false,onValueChange:change});
    const children=element.props.children as {props:Record<string,unknown>}[];
    const control=children[1];
    expect(control.props.accessibilityLabel).toBe('Use biometrics to unlock PEPSA');
    expect(control.props.onValueChange).toBe(change);
  });
});
