const passthrough = (...args: any[]) => (args.length === 1 ? String(args[0]) : args.join(' '));
const style = () => passthrough;
const boldStyle = style();
Object.assign(boldStyle, { cyan: style(), yellow: style(), red: style(), green: style() });
const chalk: any = Object.assign(passthrough, {
  yellow: style(),
  green: style(),
  red: style(),
  cyan: style(),
  dim: style(),
  bold: boldStyle,
});
export default chalk;
