import { customElement, property, state } from 'lit/decorators.js';
import { RockElement } from '../rock-element';
import { bootstrap } from '../../styles';
import {
  AanmeldingGroupField,
  aanmeldingGroupingFieldOptions,
  Report,
  Organisatieonderdeel,
  ProjectType,
  projectTypes,
  ReportRow,
  Werksituatie,
  werksituaties,
  AanmeldingReportType,
  organisatieonderdelen,
  OvernachtingDescription,
  overnachtingDescriptions,
  Aanmeldingsstatus,
  aanmeldingLabels,
  aanmeldingsstatussen,
  ActiviteitReportType,
  isAanmeldingReportType,
  activiteitGroupingFieldOptions,
  isActiviteitGroupingField,
  isActiviteitReportType,
  woonsituaties,
  Woonsituatie,
  toCsv,
  Provincie,
  Doelgroep,
  doelgroepen,
} from '@rock-solid/shared';
import { reportsClient } from './reports-client';
import { html, nothing, PropertyValues } from 'lit';
import {
  CheckboxInputControl,
  InputType,
  NumberInputControl,
  checkboxesItemsControl,
  selectControl,
} from '../forms';
import {
  downloadCsv,
  show,
  showOrganisatieonderdeel,
  showProvincie,
  unknown,
} from '../shared';

const GROUP1_TITLE = 'Totaal';
const GROUP2_TITLE = 'Aantal';

@customElement('rock-rapportage')
export class RapportageComponent extends RockElement {
  static override styles = [bootstrap];

  @property()
  public reportType!: AanmeldingReportType | ActiviteitReportType;

  @state()
  public report?: Report;

  @state()
  public projectType?: ProjectType;

  @state()
  public group1?: AanmeldingGroupField;

  @state()
  public group2?: AanmeldingGroupField;

  @state()
  public enkelEersteAanmeldingen?: boolean;

  @state()
  public organisatieonderdeel?: Organisatieonderdeel;

  @state()
  public doelgroepen?: Doelgroep[];

  @state()
  public overnachting?: OvernachtingDescription;

  @state()
  public enkelJaar?: number;

  @state()
  public aanmeldingsstatus?: Aanmeldingsstatus;

  @state()
  public isLoading = false;

  public override updated(props: PropertyValues<RapportageComponent>) {
    if (
      props.has('reportType') ||
      props.has('projectType') ||
      props.has('group1') ||
      props.has('group2') ||
      props.has('enkelEersteAanmeldingen') ||
      props.has('enkelJaar') ||
      props.has('organisatieonderdeel') ||
      props.has('doelgroepen') ||
      props.has('aanmeldingsstatus') ||
      props.has('overnachting')
    ) {
      if (isActiviteitReportType(this.reportType)) {
        if (this.group1 && !isActiviteitGroupingField(this.group1)) {
          this.group1 = undefined;
        }
        if (this.group2 && !isActiviteitGroupingField(this.group2)) {
          this.group2 = undefined;
        }
      }
      if (this.group1) {
        let reportRequest;
        switch (this.reportType) {
          case 'aanmeldingen':
          case 'deelnames':
          case 'deelnemersuren':
          case 'deelnemersurenPrognose':
            reportRequest = reportsClient.get(
              `reports/aanmeldingen/${this.reportType}`,
              this.group1,
              this.group2,
              {
                enkelEersteAanmeldingen: this.enkelEersteAanmeldingen,
                organisatieonderdeel: this.organisatieonderdeel,
                type: this.projectType,
                jaar: this.enkelJaar,
                overnachting: this.overnachting,
                aanmeldingsstatus: this.aanmeldingsstatus,
                doelgroepen: this.doelgroepen,
              },
            );
            break;
          case 'begeleidingsuren':
          case 'vormingsuren':
            reportRequest = reportsClient.get(
              `reports/activiteiten/${this.reportType}`,
              this.group1,
              this.group2,
              {
                organisatieonderdeel: this.organisatieonderdeel,
                type: this.projectType,
                jaar: this.enkelJaar,
                overnachting: this.overnachting,
                doelgroepen: this.doelgroepen,
              },
            );
            break;
        }
        this.isLoading = true;
        reportRequest
          .then((report) => (this.report = report))
          .finally(() => {
            this.isLoading = false;
          });
      }
    }
  }

  private downloadReport = () => {
    if (this.report && this.group1) {
      let csv;
      if (this.group2) {
        csv = toCsv(
          this.report.flatMap((group) =>
            group.rows!.map((row) => ({
              ...group,
              rowKey: row.key,
              rowCount: row.count,
            })),
          ),
          ['key', 'total', 'rowKey', 'rowCount'],
          {
            key: aanmeldingGroupingFieldOptions[this.group1],
            total: GROUP1_TITLE,
            rowKey: aanmeldingGroupingFieldOptions[this.group2],
            rowCount: GROUP2_TITLE,
          },
          {},
        );
      } else {
        csv = toCsv(
          this.report,
          ['key', 'total'],
          {
            key: aanmeldingGroupingFieldOptions[this.group1],
            total: GROUP1_TITLE,
          },
          {},
        );
      }
      downloadCsv(
        csv,
        `${this.reportType}-per-${this.group1}${
          this.group2 ? `-en-${this.group2}` : ''
        }`,
      );
    }
  };

  override render() {
    return html` <fieldset class="row pt-3">
        <legend class="h6">Groeperen</legend>

        <rock-reactive-form-input-control
          class="col-12 col-md-3 col-sm-5 col-lg-3"
          .control=${groupingControl('group1', this.reportType)}
          .entity=${this}
        ></rock-reactive-form-input-control>
        <rock-reactive-form-input-control
          class="col-12 col-md-3 col-sm-5 col-lg-3"
          .control=${groupingControl('group2', this.reportType)}
          .entity=${this}
        ></rock-reactive-form-input-control>
      </fieldset>
      <fieldset class="row pt-3 mb-3">
        <legend class="h6">Filteren</legend>
        <rock-reactive-form-input-control
          class="col-12 col-md-4 col-sm-6"
          .control=${projectTypeControl}
          .entity=${this}
        ></rock-reactive-form-input-control>
        <rock-reactive-form-input-control
          class="col-12 col-md-4 col-sm-6"
          .control=${projectJaarControl}
          .entity=${this}
        ></rock-reactive-form-input-control>
        <rock-reactive-form-input-control
          class="col-12 col-md-4 col-sm-6"
          .control=${organisatieonderdeelFilterControl}
          .entity=${this}
        ></rock-reactive-form-input-control>
        <rock-reactive-form-input-control
          class="col-12 col-md-4 col-sm-6"
          .control=${overnachtingControl}
          .entity=${this}
        ></rock-reactive-form-input-control>
        ${reportRoot(this.reportType) === 'aanmeldingen'
          ? html`<rock-reactive-form-input-control
                class="col-12 col-md-4 col-sm-6"
                .control=${aanmeldingsstatusControl}
                .entity=${this}
              ></rock-reactive-form-input-control>
              <rock-reactive-form-input-control
                class="col-12 col-md-4 col-sm-6"
                .control=${enkelNieuwkomersControl}
                .entity=${this}
              ></rock-reactive-form-input-control>`
          : nothing}
        <rock-reactive-checkboxes
          class="mt-2 col-12 col-md-6"
          labelClasses="col-lg-4 col-md-6 col-12"
          .control=${doelgroepenFilterControl}
          .entity=${this}
        ></rock-reactive-checkboxes>
      </fieldset>

      <div class="row">
        <div class="col">
          <h6>Resultaten</h6>
          ${this.isLoading
            ? html`<rock-loading></rock-loading>`
            : this.report && this.group1
              ? html` <button
                    @click=${this.downloadReport}
                    class="btn btn-outline-secondary"
                  >
                    <rock-icon icon="download"></rock-icon> Export
                  </button>
                  <table class="table table-hover table-sm">
                    <thead>
                      <tr>
                        <th>${aanmeldingGroupingFieldOptions[this.group1]}</th>
                        <th>${GROUP1_TITLE}</th>
                        ${this.group2
                          ? html`<th>
                                ${aanmeldingGroupingFieldOptions[this.group2]}
                              </th>
                              <th>${GROUP2_TITLE}</th>`
                          : ''}
                      </tr>
                    </thead>
                    <tbody>
                      ${this.report.map(
                        ({ key, rows, total }) =>
                          html`<tr>
                              <th rowspan="${rows?.length}">
                                ${showGroupKey(this.group1!, key)}
                              </th>
                              <td rowspan="${rows?.length}">${total}</td>
                              ${renderRowData(this.group2!, rows?.[0])}
                            </tr>
                            ${rows?.slice(1).map(
                              (row) =>
                                html`<tr>
                                  ${renderRowData(this.group2!, row)}
                                </tr>`,
                            )}`,
                      )}
                    </tbody>
                  </table>`
              : html`<p class="text-muted">
                  Nog geen rapport geladen. Kies bij "Groeperen" ten minste 1
                  groep om te starten.
                </p>`}
        </div>
      </div>`;

    function renderRowData(
      group: AanmeldingGroupField,
      row: ReportRow | undefined,
    ) {
      if (row) {
        const { key, count } = row;
        return html`<td>${showGroupKey(group, key)}</td>
          <td>${count}</td>`;
      }
    }
  }
}

function groupingControl<TName extends 'group1' | 'group2'>(
  name: TName,
  reportType: AanmeldingReportType | ActiviteitReportType,
) {
  return selectControl<RapportageComponent, TName>(
    name,
    isAanmeldingReportType(reportType)
      ? aanmeldingGroupingFieldOptions
      : (activiteitGroupingFieldOptions as Readonly<
          Record<RapportageComponent[TName] & string, string>
        >),
    { placeholder: name === 'group1' ? 'Groepeer op...' : '...en daarna op' },
  );
}
const projectTypeControl = selectControl<RapportageComponent, 'projectType'>(
  'projectType',
  projectTypes,
  { placeholder: 'Project type...' },
);
const projectJaarControl: NumberInputControl<RapportageComponent> = {
  name: 'enkelJaar',
  type: InputType.number,
  label: 'Enkel in jaar...',
  placeholder: 'Enkel in jaar...',
  step: 1,
};

const overnachtingControl = selectControl<RapportageComponent, 'overnachting'>(
  'overnachting',
  overnachtingDescriptions,
  {
    placeholder: 'Met en zonder overnachting',
    label: 'Overnachting',
  },
);

const aanmeldingsstatusControl = selectControl<
  RapportageComponent,
  'aanmeldingsstatus'
>('aanmeldingsstatus', aanmeldingsstatussen, {
  placeholder: 'Alle aanmeldingen',
  label: aanmeldingLabels.status,
});

const organisatieonderdeelFilterControl = selectControl<
  RapportageComponent,
  'organisatieonderdeel'
>('organisatieonderdeel', organisatieonderdelen, {
  placeholder: 'Enkel organisatieonderdeel...',
});

const doelgroepenFilterControl = checkboxesItemsControl<
  RapportageComponent,
  'doelgroepen'
>('doelgroepen', doelgroepen);

const enkelNieuwkomersControl: CheckboxInputControl<RapportageComponent> = {
  name: 'enkelEersteAanmeldingen',
  type: InputType.checkbox,
  label: 'Enkel eerste aanmeldingen',
};

function showGroupKey(
  group: AanmeldingGroupField,
  key: string | undefined,
): string {
  switch (group) {
    case 'jaar':
    case 'project':
    case 'geslacht':
      return show(key, unknown);
    case 'provincie':
      return showProvincie(
        (typeof key === 'string' && (key as Provincie)) || undefined,
      );
    case 'organisatieonderdeel':
      return showOrganisatieonderdeel(key as Organisatieonderdeel | undefined);
    case 'woonsituatie':
      return key ? woonsituaties[key as Woonsituatie] : unknown;
    case 'werksituatie':
      return key ? werksituaties[key as Werksituatie] : unknown;
  }
}
function reportRoot<
  TReport extends AanmeldingReportType | ActiviteitReportType,
>(
  reportType: TReport,
): TReport extends AanmeldingReportType ? 'aanmeldingen' : 'activiteiten' {
  switch (reportType) {
    case 'aanmeldingen':
    case 'deelnames':
    case 'deelnemersurenPrognose':
    case 'deelnemersuren':
      return 'aanmeldingen' as TReport extends AanmeldingReportType
        ? 'aanmeldingen'
        : 'activiteiten';
    case 'begeleidingsuren':
    case 'vormingsuren':
      return 'activiteiten' as TReport extends AanmeldingReportType
        ? 'aanmeldingen'
        : 'activiteiten';
    default:
      throw new Error(`Unknown report type ${reportType satisfies never}`);
  }
}
