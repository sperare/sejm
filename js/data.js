export const SEJM_DATA = {
  clubs: [
    'PiS',
    'PO',
    'PSL',
    'Lewica',
    'Konfederacja',
    'Niezrzeszeni'
  ],
  votingScenarios: [
    {
      scenario: 'zwykła większość',
      quorum: '50%',
      majority: 'Prosta'
    },
    {
      scenario: 'większość konstytucyjna',
      quorum: '66%',
      majority: '2/3'
    },
    {
      scenario: 'weto prezydenta',
      quorum: '50%',
      majority: 'Prosta'
    },
    {
      scenario: 'poprawki senatu',
      quorum: '50%',
      majority: 'Prosta'
    },
    {
      scenario: 'zmiana konstytucji',
      quorum: '66%',
      majority: '2/3'
    },
    {
      scenario: 'przełamanie weta sejmu',
      quorum: '50%',
      majority: 'Prosta'
    },
    {
      scenario: 'procedura skrócona',
      quorum: '50%',
      majority: 'Prosta'
    },
    {
      scenario: 'kontrola rządu',
      quorum: '50%',
      majority: 'Prosta'
    }
  ]
};