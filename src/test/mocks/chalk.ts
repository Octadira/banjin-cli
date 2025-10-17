const passthrough = (...args: any[]) => (args.length === 1 ? String(args[0]) : args.join(' '));
const style = () => passthrough;
const chalk: any = Object.assign(passthrough, {
  yellow: style(),
  green: style(),
  red: style(),
  cyan: style(),
  dim: style(),
  bold: { cyan: style(), yellow: style(), red: style(), green: style() },
});
export default chalk;
