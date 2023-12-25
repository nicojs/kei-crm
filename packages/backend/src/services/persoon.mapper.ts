import { Injectable } from '@nestjs/common';
import { DBService } from './db.service.js';
import * as db from '@prisma/client';
import {
  Contactpersoon,
  Deelnemer,
  Foldervoorkeur,
  FotoToestemming,
  OverigPersoon,
  Persoon,
  PersoonFilter,
  PersoonType,
  UpsertableDeelnemer,
  UpsertableOverigPersoon,
  UpsertablePersoon,
} from '@rock-solid/shared';
import { purgeNulls } from './mapper-utils.js';
import { toPage } from './paging.js';
import {
  toAdres,
  toCreateAdresInput,
  toUpdateAdresInput,
} from './adres.mapper.js';

export type DBPersonAggregate = db.Persoon & {
  verblijfadres: DBAdresAggregate | null;
  domicilieadres: DBAdresAggregate | null;
  foldervoorkeuren: db.Foldervoorkeur[];
  eersteCursusAanmelding: (db.Aanmelding & { project: db.Project }) | null;
  eersteVakantieAanmelding: (db.Aanmelding & { project: db.Project }) | null;
};

export type DBAdresAggregate = db.Adres & { plaats: db.Plaats };

/**
 * A data mapper for persoon
 * @see https://martinfowler.com/eaaCatalog/dataMapper.html
 */
@Injectable()
export class PersoonMapper {
  constructor(private db: DBService) {}

  async getOne(
    userWhereUniqueInput: db.Prisma.PersoonWhereUniqueInput,
  ): Promise<Persoon | null> {
    const persoon = await this.db.persoon.findUnique({
      where: userWhereUniqueInput,
      include: includePersoonAggregate,
    });
    return this.maybeToPersoon(persoon);
  }

  async getAll(
    filter: PersoonFilter,
    pageNumber: number | undefined,
  ): Promise<Persoon[]> {
    const people = await this.db.persoon.findMany({
      where: where(filter),
      orderBy: [
        {
          achternaam: 'asc',
        },
        { voornaam: 'asc' },
      ],
      include: includePersoonAggregate,
      ...toPage(pageNumber),
    });
    return people.map(toPersoon);
  }

  async delete(id: number) {
    await this.db.persoon.delete({ where: { id } });
  }

  async count(filter: PersoonFilter): Promise<number> {
    const count = await this.db.persoon.count({
      where: where(filter),
    });
    return count;
  }

  async createPersoon(persoon: UpsertablePersoon): Promise<Persoon> {
    const {
      id,
      verblijfadres,
      domicilieadres,
      foldervoorkeuren,
      eersteCursus,
      eersteVakantie,
      contactpersoon,
      fotoToestemming,
      ...props
    } = fillOutAllUpsertablePersoonFields(persoon);
    const dbPersoon = await this.db.persoon.create({
      data: {
        ...props,
        ...toContactPersoonFields(contactpersoon),
        ...toFotoToestemmingFields(fotoToestemming),
        volledigeNaam: computeVolledigeNaam(props),
        verblijfadres: toCreateAdresInput(verblijfadres),
        domicilieadres: domicilieadres
          ? toCreateAdresInput(domicilieadres)
          : undefined,
        foldervoorkeuren: foldervoorkeuren
          ? {
              createMany: {
                data: foldervoorkeuren,
              },
            }
          : undefined,
      },
      include: includePersoonAggregate,
    });
    return toPersoon(dbPersoon);
  }

  async updatePersoon({
    where,
    persoon,
  }: {
    where: db.Prisma.PersoonWhereUniqueInput;
    persoon: Persoon;
  }): Promise<Persoon> {
    const {
      id: personId,
      verblijfadres,
      domicilieadres,
      eersteCursus,
      eersteVakantie,
      contactpersoon,
      fotoToestemming,
      ...props
    } = fillOutAllPersoonFields(persoon);
    const { verblijfadresId, domicilieadresId } =
      await this.db.persoon.findUniqueOrThrow({
        where: { id: personId },
        select: { verblijfadresId: true, domicilieadresId: true },
      });
    const result = await this.db.persoon.update({
      where,
      data: {
        ...props,
        ...toContactPersoonFields(contactpersoon),
        ...toFotoToestemmingFields(fotoToestemming),
        volledigeNaam: computeVolledigeNaam(props),
        verblijfadres: toUpdateAdresInput(
          verblijfadres,
          typeof verblijfadresId === 'number',
        ),
        domicilieadres: toUpdateAdresInput(
          domicilieadres,
          typeof domicilieadresId === 'number',
        ),
        foldervoorkeuren: toFoldervoorkeurInput(persoon),
      },
      include: includePersoonAggregate,
    });

    // Delete domicilieadres after the fact of needed (this is the only way)
    if (!domicilieadres && result.domicilieadres) {
      return toPersoon(
        await this.db.persoon.update({
          where,
          data: { domicilieadres: { delete: true } },
          include: includePersoonAggregate,
        }),
      );
    } else {
      return toPersoon(result);
    }
  }

  async deleteUser(where: db.Prisma.PersoonWhereUniqueInput): Promise<Persoon> {
    return toPersoon(
      await this.db.persoon.delete({
        where,
        include: includePersoonAggregate,
      }),
    );
  }

  private maybeToPersoon(maybeP: DBPersonAggregate | null): Persoon | null {
    return maybeP ? toPersoon(maybeP) : null;
  }
}

function computeVolledigeNaam({
  voornaam,
  achternaam,
}: Pick<Persoon, 'voornaam' | 'achternaam'>) {
  return `${voornaam ? `${voornaam} ` : ''}${achternaam}`;
}

export function toPersoon(p: DBPersonAggregate): Persoon {
  const {
    domicilieadres,
    domicilieadresId,
    verblijfadres,
    verblijfadresId,
    volledigeNaam,
    foldervoorkeuren,
    eersteCursusAanmelding,
    eersteVakantieAanmelding,
    eersteCursusAanmeldingId,
    eersteVakantieAanmeldingId,
    contactpersoon,
    contactpersoonEmail,
    contactpersoonGsm,
    contactpersoonTelefoon,
    toestemmingFotosFolder,
    toestemmingFotosInfoboekje,
    toestemmingFotosNieuwsbrief,
    toestemmingFotosSocialeMedia,
    toestemmingFotosWebsite,
    ...person
  } = p;
  return {
    ...purgeNulls(person),
    contactpersoon: toContactPersoon({
      contactpersoonEmail,
      contactpersoonGsm,
      contactpersoonTelefoon,
      contactpersoon,
    }),
    fotoToestemming: toFotoToestemming({
      toestemmingFotosFolder,
      toestemmingFotosInfoboekje,
      toestemmingFotosNieuwsbrief,
      toestemmingFotosSocialeMedia,
      toestemmingFotosWebsite,
    }),
    domicilieadres: toAdres(domicilieadres),
    verblijfadres: toAdres(verblijfadres),
    foldervoorkeuren: foldervoorkeuren.map(toFoldervoorkeur),
    eersteCursus: eersteCursusAanmelding?.project.projectnummer,
    eersteVakantie: eersteVakantieAanmelding?.project.projectnummer,
  };
}

function toFoldervoorkeur(foldervoorkeur: db.Foldervoorkeur): Foldervoorkeur {
  return {
    communicatie: foldervoorkeur.communicatie,
    folder: foldervoorkeur.folder,
  };
}

function where(filter: PersoonFilter): db.Prisma.PersoonWhereInput {
  switch (filter.searchType) {
    case 'persoon':
      const {
        searchType,
        foldersoorten,
        selectie,
        laatsteAanmeldingJaarGeleden,
        contactpersoon,
        ...where
      } = filter;
      return {
        ...where,
        ...toContactPersoonFields(contactpersoon),
        ...(foldersoorten?.length
          ? { foldervoorkeuren: { some: { folder: { in: foldersoorten } } } }
          : {}),
        ...(selectie?.length ? { selectie: { hasSome: selectie } } : {}),
        ...(laatsteAanmeldingJaarGeleden !== undefined
          ? {
              aanmeldingen: {
                some: {
                  project: {
                    jaar: {
                      gte:
                        new Date().getFullYear() - laatsteAanmeldingJaarGeleden,
                    },
                  },
                },
              },
            }
          : {}),
      };
    case 'text':
      const whereStatement = {
        volledigeNaam: { contains: filter.search, mode: 'insensitive' },
        type: filter.type,
      } as const;
      if (filter.type === 'overigPersoon' && filter.overigePersoonSelectie) {
        return {
          ...whereStatement,
          selectie: {
            hasSome: filter.overigePersoonSelectie
              ? [filter.overigePersoonSelectie]
              : undefined,
          },
        };
      } else {
        return whereStatement;
      }
  }
}

export const includePersoonAggregate = Object.freeze({
  verblijfadres: Object.freeze({
    include: Object.freeze({
      plaats: true,
    }),
  }),
  domicilieadres: Object.freeze({
    include: Object.freeze({
      plaats: true,
    }),
  }),
  foldervoorkeuren: true,
  eersteCursusAanmelding: Object.freeze({
    include: Object.freeze({
      project: true,
    }),
  }),
  eersteVakantieAanmelding: Object.freeze({
    include: Object.freeze({
      project: true,
    }),
  }),
} as const);

function toFoldervoorkeurInput(
  persoon: Persoon,
): db.Prisma.FoldervoorkeurUpdateManyWithoutPersoonNestedInput | undefined {
  return {
    deleteMany: {
      persoonId: persoon.id,
      folder: {
        notIn: persoon.foldervoorkeuren.map(({ folder }) => folder),
      },
    },
    upsert: persoon.foldervoorkeuren.map(({ communicatie, folder }) => ({
      where: {
        folder_persoonId: {
          folder,
          persoonId: persoon.id,
        },
      },
      create: { folder, communicatie },
      update: { folder, communicatie },
    })),
  };
}

type AllUpsertablePersoonFields = Omit<UpsertableDeelnemer, 'type'> &
  Omit<UpsertableOverigPersoon, 'type'> & {
    type: PersoonType;
  };

type AllPersoonFields = Omit<Deelnemer, 'type'> &
  Omit<OverigPersoon, 'type'> & {
    type: PersoonType;
  };

/**
 * This is a hack to make it easier to work with the UpsertablePersoon type
 */
function fillOutAllUpsertablePersoonFields(
  persoon: UpsertablePersoon,
): AllUpsertablePersoonFields {
  return {
    foldervoorkeuren: [],
    selectie: [],
    ...persoon,
  };
}
/**
 * This is a hack to make it easier to work with the Persoon type
 */
function fillOutAllPersoonFields(persoon: Persoon): AllPersoonFields {
  return {
    selectie: [],
    woonsituatie: 'onbekend',
    werksituatie: 'onbekend',
    fotoToestemming: {
      folder: false,
      infoboekje: false,
      nieuwsbrief: false,
      socialeMedia: false,
      website: false,
    },
    contactpersoon: {},
    ...persoon,
  };
}

type ContactPersoonFields = Pick<
  db.Prisma.PersoonCreateInput,
  | 'contactpersoon'
  | 'contactpersoonEmail'
  | 'contactpersoonGsm'
  | 'contactpersoonTelefoon'
>;

function toContactPersoonFields(
  contactpersoon?: Contactpersoon,
): ContactPersoonFields {
  return {
    contactpersoon: contactpersoon?.naam ?? null,
    contactpersoonEmail: contactpersoon?.email ?? null,
    contactpersoonGsm: contactpersoon?.gsm ?? null,
    contactpersoonTelefoon: contactpersoon?.telefoon ?? null,
  };
}

function toContactPersoon(contact: ContactPersoonFields): Contactpersoon {
  return purgeNulls({
    naam: contact.contactpersoon,
    email: contact.contactpersoonEmail,
    gsm: contact.contactpersoonGsm,
    telefoon: contact.contactpersoonTelefoon,
  });
}

type FotoToestemmingFields = Pick<
  db.Persoon,
  | 'toestemmingFotosFolder'
  | 'toestemmingFotosInfoboekje'
  | 'toestemmingFotosNieuwsbrief'
  | 'toestemmingFotosSocialeMedia'
  | 'toestemmingFotosWebsite'
>;

function toFotoToestemmingFields(
  toestemming?: FotoToestemming,
): FotoToestemmingFields {
  return {
    toestemmingFotosFolder: toestemming?.folder ?? false,
    toestemmingFotosInfoboekje: toestemming?.infoboekje ?? false,
    toestemmingFotosNieuwsbrief: toestemming?.nieuwsbrief ?? false,
    toestemmingFotosSocialeMedia: toestemming?.socialeMedia ?? false,
    toestemmingFotosWebsite: toestemming?.website ?? false,
  };
}

function toFotoToestemming(contact: FotoToestemmingFields): FotoToestemming {
  return {
    folder: contact.toestemmingFotosFolder,
    infoboekje: contact.toestemmingFotosInfoboekje,
    nieuwsbrief: contact.toestemmingFotosNieuwsbrief,
    socialeMedia: contact.toestemmingFotosSocialeMedia,
    website: contact.toestemmingFotosWebsite,
  };
}
