export type component_list_type = {
  fe_id: string;
  isHidden: boolean;
  isLocked: boolean;
  title: string;
  type:
    | 'questionTitle'
    | 'questionTextArea'
    | 'questionRadio'
    | 'questionParagraph'
    | 'questionInput'
    | 'questionInfo'
    | 'questionCheckbox';
  props: Record<string, any>;
  order: number;
};
