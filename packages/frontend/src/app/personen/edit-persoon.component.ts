import { html, LitElement } from 'lit';
import {
  geslachten,
  UpsertablePersoon,
  Deelnemer,
  woonsituaties,
  werksituaties,
  BasePersoon,
  OverigPersoon,
  overigPersoonSelecties,
  voedingswensen,
} from '@rock-solid/shared';
import { customElement, property } from 'lit/decorators.js';
import { bootstrap } from '../../styles';
import {
  FormControl,
  InputType,
  formGroup,
  adresControls,
  formArray,
  foldervoorkeurControls,
  checkboxesControl,
  radioControl,
} from '../forms';

@customElement('rock-edit-persoon')
export class EditPersoonComponent extends LitElement {
  @property({ attribute: false })
  private persoon!: UpsertablePersoon;

  static override styles = [bootstrap];

  private async submit() {
    const event = new CustomEvent('persoon-submitted', {
      bubbles: true,
      composed: true,
      detail: this.persoon,
    });
    this.dispatchEvent(event);
  }

  override render() {
    return html`<rock-reactive-form
      @rock-submit="${this.submit}"
      .controls="${this.persoon.type === 'deelnemer'
        ? deelnemerFormControls
        : overigPersoonFormControls}"
      .entity="${this.persoon}"
    ></rock-reactive-form>`;
  }
}

const basePersoonFormControls: FormControl<BasePersoon>[] = [
  {
    name: 'achternaam',
    label: 'Naam',
    type: InputType.text,
    validators: {
      minLength: 3,
      required: true,
    },
  },
  { name: 'voornaam', type: InputType.text },
  { name: 'emailadres', type: InputType.email },
  radioControl('geslacht', geslachten),
  {
    name: 'geboortedatum',
    type: InputType.date,
    validators: {
      min: new Date(1910, 1, 1),
      max: new Date(new Date().getFullYear() - 5, 1, 1),
    },
  },
  radioControl('voedingswens', voedingswensen),
  formGroup(
    'verblijfadres',
    [
      {
        name: 'straatnaam',
        type: InputType.text,
        validators: { required: true },
      },
      {
        name: 'huisnummer',
        type: InputType.text,
        validators: { required: true },
      },
      {
        name: 'plaats',
        type: InputType.plaats,
        label: 'Woonplaats',
        validators: { required: true },
      },
      { name: 'busnummer', type: InputType.text },
    ],
    { required: true },
  ),
  {
    name: 'gsmNummer',
    label: 'GSM',
    type: InputType.tel,
  },
  {
    name: 'telefoonnummer',
    type: InputType.tel,
  },
  {
    name: 'rekeningnummer',
    type: InputType.text,
    placeholder: 'BE12 3456 7890 1234',
    validators: {
      //https://stackoverflow.com/questions/44656264/iban-regex-design
      pattern:
        '^([A-Z]{2}[ -]?[0-9]{2})(?=(?:[ -]?[A-Z0-9]){9,30}$)((?:[ -]?[A-Z0-9]{3,5}){2,7})([ -]?[A-Z0-9]{1,3})?$',
    },
  },
  {
    name: 'rijksregisternummer',
    type: InputType.text,
    placeholder: '90.02.01-999-02',
    validators: {
      // https://nl.wikipedia.org/wiki/Rijksregisternummer
      pattern: '^\\d{2}\\.\\d{2}\\.\\d{2}-\\d{3}-\\d{2}$',
    },
  },
  {
    name: 'opmerking',
    type: InputType.text,
  },
];

const overigPersoonFormControls: FormControl<OverigPersoon>[] = [
  ...basePersoonFormControls,
  {
    name: 'vrijwilligerOpmerking',
    label: 'Vrijwilliger opmerking',
    type: InputType.text,
  },
  checkboxesControl('selectie', false, overigPersoonSelecties),
  formArray('foldervoorkeuren', foldervoorkeurControls),
];

const deelnemerFormControls: FormControl<Deelnemer>[] = [
  ...basePersoonFormControls,
  formGroup('domicilieadres', adresControls, {
    required: false,
    requiredLabel: 'Domicilieadres is anders dan het verblijfadres',
  }),
  radioControl('woonsituatie', woonsituaties),
  {
    name: 'woonsituatieOpmerking',
    label: 'Opmerking',
    type: InputType.text,
  },
  radioControl('werksituatie', werksituaties),
  {
    name: 'werksituatieOpmerking',
    label: 'Opmerking',
    type: InputType.text,
  },
];