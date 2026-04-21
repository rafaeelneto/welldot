export type Option = {
  label: string;
  value: string;
};

export type SelectOptions = {
  options: Option[] | any[];
  disabled?: boolean;
};
