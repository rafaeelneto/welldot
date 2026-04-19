import { DeepPartial } from "./generic.types";

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
  lithology: {
    group: string;
    rect: string;
  };
  fractures: {
    group: string;
    item: string;
    hitArea: string;
    line: string;
    polyline: string;
  };
  caves: {
    group: string;
    item: string;
    fill: string;
    contact: string;
  };
  constructionGroup: string;
  cementPad: {
    group: string;
    item: string;
  };
  boreHole: {
    group: string;
    rect: string;
  };
  surfaceCase: {
    group: string;
    rect: string;
  };
  holeFill: {
    group: string;
    rect: string;
  };
  wellCase: {
    group: string;
    rect: string;
  };
  wellScreen: {
    group: string;
    rect: string;
  };
  conflict: {
    group: string;
    rect: string;
  };
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

export type Colors = {
    geology: {
        lithology: {
            stroke: string;
        };
        cave: {
            dry: {
                stroke: string;
            };
            wet: {
                stroke: string;
            };
        };
        fracture: {
            dry: {
                stroke: string;
            };
            wet: {
                stroke: string;
            };
        };
    };
    construction: {
        cementPad: {
            stroke: string;
        };
        boreHole: {
            fill: string;
            stroke: string;
        };
        surfaceCase: {
            fill: string;
        };
        holeFill: {
            stroke: string;
        };
        wellCase: {
            fill: string;
            stroke: string;
        };
        wellScreen: {
            stroke: string;
        };
        conflict: {
            stroke: string;
        };
    };
};

export type ColorsOverride = DeepPartial<Colors>;
