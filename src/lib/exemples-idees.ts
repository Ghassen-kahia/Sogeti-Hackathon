type Exemple = { titre: string; description: string; tag: string };

const PAR_DEFAUT: Exemple = {
  titre: "Ex. : Des bancs à l'ombre près de l'arrêt de tram",
  description: "Quel problème votre idée résout-elle ? Comment la mettre en place ?",
  tag: "Ex. : seniors, puis Entrée",
};

// Les textes d'aide changent avec la catégorie : un exemple concret aide à se lancer.
const PAR_CATEGORIE: Record<string, Exemple> = {
  mobilite: {
    titre: "Ex. : Une piste cyclable continue jusqu'à la gare",
    description: "Ex. : La piste s'arrête avant le pont et oblige à rouler sur la route. La prolonger sécuriserait le trajet des familles.",
    tag: "Ex. : vélo, puis Entrée",
  },
  "espaces-verts": {
    titre: "Ex. : Un jardin partagé au pied des immeubles",
    description: "Ex. : La pelouse derrière la place pourrait accueillir dix bacs à cultiver, avec des ateliers pour les écoles voisines.",
    tag: "Ex. : jardin, puis Entrée",
  },
  culture: {
    titre: "Ex. : Une boîte à livres à l'arrêt de tram",
    description: "Ex. : Une petite bibliothèque à l'abri de la pluie pour échanger des livres, fabriquée avec l'atelier bois du centre social.",
    tag: "Ex. : lecture, puis Entrée",
  },
  solidarite: {
    titre: "Ex. : Un frigo solidaire géré par les habitants",
    description: "Ex. : Un réfrigérateur en libre-service, entretenu par des bénévoles, pour partager les invendus des commerçants.",
    tag: "Ex. : entraide, puis Entrée",
  },
  proprete: {
    titre: "Ex. : Des cendriers aux arrêts de bus",
    description: "Ex. : Les abords des arrêts sont couverts de mégots. Des cendriers et un ramassage plus régulier changeraient vite les choses.",
    tag: "Ex. : mégots, puis Entrée",
  },
  commerces: {
    titre: "Ex. : Une rue piétonne le samedi",
    description: "Ex. : Fermer la rue aux voitures de 10 h à 18 h laisserait de la place aux terrasses, avec un accès garanti aux riverains.",
    tag: "Ex. : marché, puis Entrée",
  },
  "sport-loisirs": {
    titre: "Ex. : Un terrain multisport ouvert en soirée",
    description: "Ex. : Le terrain ferme à 18 h. Un éclairage avec minuterie permettrait aux jeunes d'y jouer jusqu'à 21 h.",
    tag: "Ex. : jeunes, puis Entrée",
  },
};

export function exempleIdee(slugCategorie: string | undefined) {
  return (slugCategorie && PAR_CATEGORIE[slugCategorie]) || PAR_DEFAUT;
}
