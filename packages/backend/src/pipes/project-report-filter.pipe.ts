import { PipeTransform, Injectable } from '@nestjs/common';
import {
  isAanmeldingsstatus,
  isOrganisatieonderdeel,
  isOvernachtingDescription,
  isProjectType,
  ProjectReportFilter,
} from '@rock-solid/shared';

@Injectable()
export class ProjectReportFilterPipe
  implements
    PipeTransform<Record<string, string | undefined>, ProjectReportFilter>
{
  transform(value: Record<string, string | undefined>): ProjectReportFilter {
    const filter: ProjectReportFilter = {};
    filter.enkelEersteAanmeldingen = key('enkelEersteAanmeldingen') in value;
    const onderdeel = value[key('organisatieonderdeel')];
    if (onderdeel && isOrganisatieonderdeel(onderdeel)) {
      filter.organisatieonderdeel = onderdeel;
    }
    const projectType = value[key('type')];
    if (projectType && isProjectType(projectType)) {
      filter.type = projectType;
    }
    const jaar = value[key('jaar')];
    if (jaar) {
      filter.jaar = parseInt(jaar);
    }
    const overnachting = value[key('overnachting')];
    if (overnachting && isOvernachtingDescription(overnachting)) {
      filter.overnachting = overnachting;
    }
    const aanmeldingsstatus = value[key('aanmeldingsstatus')];
    if (aanmeldingsstatus && isAanmeldingsstatus(aanmeldingsstatus)) {
      filter.aanmeldingsstatus = aanmeldingsstatus;
    }
    return filter;
  }
}

function key<T extends keyof ProjectReportFilter>(k: T): T {
  return k;
}
