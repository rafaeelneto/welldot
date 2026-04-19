export type ComponentsClassNames = {
  tooltip: string;
  tooltipTitle: string;
  tooltipPrimaryInfo: string;
  tooltipSecondaryInfo: string;
  yAxis: string;
  wellGroup: string;
  geologicGroup: string;
  lithologyGroup: string;
  fracturesGroup: string;
  cavesGroup: string;
  constructionGroup: string;
  cementPadGroup: string;
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
