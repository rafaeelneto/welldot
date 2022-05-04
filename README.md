# Well Profiler

There's only a few softwares that helps geologists and engineers to build and view water well profiles. The only tool available (at last that I know) is a paid software.

Well Profiler is web app built with react that can be used to scratch or document water wells profiles. With Well Profiler, the user can easily visualize and edit well construction and geology details. It saves the profile data in a JSON format and can export profile and construction details in a printable PDF file.
The code is open source and the data structure format can be used by any other application.

You can check the app in the [Well Profiler website](wellprofiler.com)

The app should be used by anyone interested like geologists and engineers.

Some functions of the app:

- Provide a data visualization to water well profiles

- Export the profile as a printable PDF file

- Provide some quantitative values that can be used on cost estimates.

# Tech

The web interface of the app is built in Typescript using React (in the future, it may be used fluttler or react native to add a mobile app). Below there are some libraries and tools used:

- [D3.js](https://d3js.org/)
- [PDFMake.js](http://pdfmake.org/#/)

# Formats

I suggest a data structure format in other store water well constructive and geologic data. It's as follows:

```typescript
type WATER_WELL_PROFILE_TYPE = {
  name: string | undefined;
  units: {
    diam_unit: 'metric' | 'imperial';
    depth_unit: 'metric' | 'imperial';
  };
  info:
    | {
        headingInfo: { label: string; value: string }[] | undefined;
        endInfo: { label: string; value: string }[] | undefined;
      }
    | undefined;
  geologic: {
    from: number; // start depth of the layer or component
    to: number; // end depth of the layer or component
    description: string; // description of the geologic layer
    color: string; // color of the layer
    fgdc_texture: string | number; // texture code of the FGDC Patterns by USGS
    geologic_unit: string; // name of the geologic unit
  }[];
  constructive: {
    bore_hole: {
      from: number;
      to: number;
      diam_pol: number;
    }[];
    well_case: {
      from: number;
      to: number;
      type: string;
      diam_pol: number;
    }[];
    reduction: {
      from: number;
      to: number;
      diam_from: number;
      diam_to: number;
      type: string;
    }[];
    well_screen: {
      from: number;
      to: number;
      type: string;
      diam_pol: number;
      screen_slot_mm: number;
    }[];
    surface_case: {
      from: number;
      to: number;
      diam_pol: number;
    }[];
    hole_fill: {
      from: number;
      to: number;
      type: 'gravel_pack' | 'seal';
      diam_pol: number;
      description: string;
    }[];
    cement_pad: {
      type: string;
      width: number;
      thickness: number;
      length: number;
    };
    intake_depth: number | undefined;
  };
};
```

The Water Profiler uses the [FGDC Geologic map standard](https://ngmdb.usgs.gov/fgdc_gds/geolsymstd/download.php) to simbolize different geologic units as the user chooses.

Any suggestion or improvement are welcomed. Please, feel free to contact me if you want.
