export type ComponentsClassNames = {
  tooltip: {
    root: string;
    title: string;
    primaryInfo: string;
    secondaryInfo: string;
  };
  yAxis: string;
  wellGroup: string;
  geologicGroup: string;
  lithologyGroup: string;
  fractures: {
    group: string;
    item: string;
  };
  caves: {
    group: string;
    item: string;
  };
  constructionGroup: string;
  cementPad: {
    group: string;
    item: string;
  };
  holeGroup: string;
  surfaceCaseGroup: string;
  holeFillGroup: string;
  wellCaseGroup: string;
  wellScreenGroup: string;
  conflictGroup: string;
};

export type SvgInstance = {
  selector: string;
  height: number;
  width: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};
