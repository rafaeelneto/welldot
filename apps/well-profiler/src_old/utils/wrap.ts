/* eslint-disable no-unused-vars */
import * as d3 from 'd3';

export default function wrap(textSet, width) {
  textSet.each(function wordIterator(textEl) {
    // @ts-ignore
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: any | never = '';
    let line: any[] = [];
    // eslint-disable-next-line prefer-const
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const x = text.attr('x');
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy'));
    let tspan = text
      .text(null)
      .append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', `${dy}em`);

    // eslint-disable-next-line no-cond-assign
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));

      if (tspan!.node!()!.getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text
          .append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', `${lineHeight + dy}em`)
          .text(word);
      }
    }
  });
}
