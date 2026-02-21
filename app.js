document.addEventListener('DOMContentLoaded', () => {
    // ==== DATA ====
    const initialClubs = [
        { id: 'pis', name: 'Prawo i Sprawiedliwość', size: 188, color: '#0052a5', defaultNieobecni: 2 },
        { id: 'ko', name: 'Koalicja Obywatelska', size: 156, color: '#f08b1d' },
        { id: 'psl', name: 'Polskie Stronnictwo Ludowe', size: 32, color: '#16a34a' },
        { id: 'lewica', name: 'Lewica', size: 21, color: '#ef4444' },
        { id: 'konfederacja', name: 'Konfederacja', size: 16, color: '#1e3a8a' },
        { id: 'p2050', name: 'Polska 2050', size: 15, color: '#fcd34d' },
        { id: 'centrum', name: 'Centrum', size: 15, color: '#ffb300' }, // Vibrant yellow/orange to distinguish from p2050 and KO
        { id: 'razem', name: 'Razem', size: 4, color: '#E32636' }, // Alizarin Crimson
        { id: 'db', name: 'Demokracja Bezpośrednia', size: 4, color: '#0ea5e9' },
        { id: 'korona', name: 'Konfederacja Korony Polskiej', size: 3, color: '#b45309' },
        { id: 'niezrzeszeni', name: 'Niezrzeszeni', size: 6, color: '#64748b' } // Updated to 6 (Wikipedia says 6 for 2026 X term)
    ];

    // Typy większości
    const majorityTypes = {
        'zwykla': {
            name: 'Większość Zwykła',
            description: 'Głosy ZA muszą być większe niż PRZECIW. Wstrzymujące nie liczą się.',
            calculateThreshold: (za, przeciw, wstrzym) => przeciw + 1,
            evaluate: (za, przeciw, wstrzym) => za > przeciw,
            quorumReq: 230
        },
        'bezwzgledna': {
            name: 'Większość Bezwzględna',
            description: 'Głosy ZA muszą być większe niż suma PRZECIW i WSTRZYMUJĄCYCH SIĘ.',
            calculateThreshold: (za, przeciw, wstrzym) => przeciw + wstrzym + 1,
            evaluate: (za, przeciw, wstrzym) => za > (przeciw + wstrzym),
            quorumReq: 230
        },
        '3/5': {
            name: 'Większość 3/5 (np. weto)',
            description: 'Głosy ZA muszą stanowić co najmniej 3/5 głousjących (Za+Przeciw+Wstrzym)',
            calculateThreshold: (za, przeciw, wstrzym) => Math.ceil((za + przeciw + wstrzym) * 0.6),
            evaluate: (za, przeciw, wstrzym) => za >= Math.ceil((za + przeciw + wstrzym) * 0.6),
            quorumReq: 230
        },
        '2/3': {
            name: 'Większość 2/3 (np. zmiana Konstytucji)',
            description: 'Głosy ZA muszą stanowić co najmniej 2/3 głosujących (Za+Przeciw+Wstrzym)',
            calculateThreshold: (za, przeciw, wstrzym) => Math.ceil((za + przeciw + wstrzym) * (2 / 3)),
            evaluate: (za, przeciw, wstrzym) => za >= Math.ceil((za + przeciw + wstrzym) * (2 / 3)),
            quorumReq: 230 // Czasem więcej, ale przyjmujemy 230 dla demonstracji. Konstytucja: min. polowa ost. liczby.
        }
    };

    let clubsState = []; // Holds current vote state for each club

    // ==== DOM ELEMENTS ====
    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    const majoritySelect = document.getElementById('majority-type');
    const thresholdInfo = document.getElementById('threshold-info');
    const votesDiff = document.getElementById('votes-diff');

    const resultStatus = document.getElementById('result-status');
    const quorumText = document.getElementById('quorum-text');
    const quorumWarning = document.getElementById('quorum-warning');
    const quorumBar = document.getElementById('quorum-bar');

    const totalZaEl = document.getElementById('total-za');
    const totalPrzeciwEl = document.getElementById('total-przeciw');
    const totalWstrzymEl = document.getElementById('total-wstrzym');
    const totalNieobecniEl = document.getElementById('total-nieobecni');
    const totalSeatsCountEl = document.getElementById('total-seats-count');

    const barZa = document.getElementById('bar-za');
    const barPrzeciw = document.getElementById('bar-przeciw');
    const barWstrzym = document.getElementById('bar-wstrzym');
    const thresholdLine = document.getElementById('threshold-line');

    const clubsListEl = document.getElementById('clubs-list');
    const clubTemplate = document.getElementById('club-template');

    const resetBtn = document.getElementById('reset-all-btn');

    // ==== INITIALIZATION ====
    function init() {
        // Theme
        const storedTheme = localStorage.getItem('theme') || 'dark';
        if (storedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Fix counts to ensure exact 460
        let currentTotal = initialClubs.reduce((sum, c) => sum + c.size, 0);
        if (currentTotal !== 460) {
            // Adjust niezrzeszeni to make it 460
            const niez = initialClubs.find(c => c.id === 'niezrzeszeni');
            if (niez) {
                niez.size += (460 - currentTotal);
                if (niez.size < 0) niez.size = 0;
            }
        }

        // Copy initial data to state
        clubsState = initialClubs.map(c => {
            const baseAbs = c.defaultNieobecni || 0;
            return {
                ...c,
                za: 0,
                przeciw: 0,
                // Default everyone to 'Wstrzymał się' except for base absent
                wstrzym: c.size - baseAbs,
                nieobecni: baseAbs,
                baseAbsent: baseAbs
            };
        });

        renderClubs();
        calculateResults();

        // Listeners
        themeToggle.addEventListener('click', toggleTheme);
        majoritySelect.addEventListener('change', calculateResults);
        resetBtn.addEventListener('click', resetVotes);

        // Global politics
        const rzadIds = ['ko', 'psl', 'lewica', 'p2050', 'centrum'];
        const opozycjaIds = ['pis', 'konfederacja', 'razem', 'db', 'korona'];

        let niezrzeszeniRzadVote = 'wstrzym';
        let niezrzeszeniOpozycjaVote = 'wstrzym';

        const applyNiezrzeszeniSplits = () => {
            const club = clubsState.find(c => c.id === 'niezrzeszeni');
            if (!club) return;
            club.za = 0; club.przeciw = 0; club.wstrzym = 0; club.nieobecni = 0;
            club[niezrzeszeniRzadVote] += 3;
            club[niezrzeszeniOpozycjaVote] += 3;
            updateClubDOM('niezrzeszeni');
            calculateResults();
        };

        document.getElementById('rzad-za').addEventListener('click', () => {
            setGroupVotes(rzadIds, 'za');
            niezrzeszeniRzadVote = 'za';
            applyNiezrzeszeniSplits();
        });
        document.getElementById('rzad-przeciw').addEventListener('click', () => {
            setGroupVotes(rzadIds, 'przeciw');
            niezrzeszeniRzadVote = 'przeciw';
            applyNiezrzeszeniSplits();
        });
        document.getElementById('opozycja-za').addEventListener('click', () => {
            setGroupVotes(opozycjaIds, 'za');
            niezrzeszeniOpozycjaVote = 'za';
            applyNiezrzeszeniSplits();
        });
        document.getElementById('opozycja-przeciw').addEventListener('click', () => {
            setGroupVotes(opozycjaIds, 'przeciw');
            niezrzeszeniOpozycjaVote = 'przeciw';
            applyNiezrzeszeniSplits();
        });

        resetBtn.addEventListener('click', () => {
            niezrzeszeniRzadVote = 'wstrzym';
            niezrzeszeniOpozycjaVote = 'wstrzym';
        });
    }

    function setGroupVotes(group, type) {
        group.forEach(clubId => {
            const club = clubsState.find(c => c.id === clubId);
            if (!club) return;
            club.za = 0; club.przeciw = 0; club.wstrzym = 0; club.nieobecni = 0;
            const votingPool = Math.max(0, club.size - (club.baseAbsent || 0));
            club[type] = votingPool;
            club.nieobecni = club.size - votingPool;
            updateClubDOM(clubId);
        });
        calculateResults();
    }

    // ==== THEME ====
    function toggleTheme() {
        const currentTh = document.documentElement.getAttribute('data-theme');
        if (currentTh === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        }
    }

    // ==== RENDER ====
    function renderClubs() {
        clubsListEl.innerHTML = '';
        clubsState.forEach(club => {
            const clone = clubTemplate.content.cloneNode(true);
            const card = clone.querySelector('.club-card');
            card.dataset.clubId = club.id;

            clone.querySelector('.club-color-dot').style.backgroundColor = club.color;
            clone.querySelector('.club-name').textContent = club.name;

            const sizeInput = clone.querySelector('.club-size-input');
            sizeInput.value = club.size;
            sizeInput.addEventListener('change', (e) => handleSizeChange(club.id, parseInt(e.target.value) || 0));

            // Vote inputs
            const inZa = clone.querySelector('.input-za');
            const inPrzeciw = clone.querySelector('.input-przeciw');
            const inWstrzym = clone.querySelector('.input-wstrzym');

            inZa.value = club.za;
            inPrzeciw.value = club.przeciw;
            inWstrzym.value = club.wstrzym;
            clone.querySelector('.input-nieobecni').value = club.nieobecni;

            inZa.addEventListener('input', (e) => handleVoteChange(club.id, 'za', parseInt(e.target.value) || 0));
            inPrzeciw.addEventListener('input', (e) => handleVoteChange(club.id, 'przeciw', parseInt(e.target.value) || 0));
            inWstrzym.addEventListener('input', (e) => handleVoteChange(club.id, 'wstrzym', parseInt(e.target.value) || 0));

            const nieobInput = clone.querySelector('.input-nieobecni');
            nieobInput.value = club.nieobecni;
            nieobInput.addEventListener('input', (e) => handleVoteChange(club.id, 'nieobecni', parseInt(e.target.value) || 0));
            if (club.id === 'pis') {
                nieobInput.title = "Zbigniew Ziobro 🇭🇺\nMarcin Romanowski 🇭🇺";
            }

            // Bulk actions
            clone.querySelector('.za-bulk').addEventListener('click', () => setClubVotes(club.id, 'za'));
            clone.querySelector('.przeciw-bulk').addEventListener('click', () => setClubVotes(club.id, 'przeciw'));
            clone.querySelector('.wstrzym-bulk').addEventListener('click', () => setClubVotes(club.id, 'wstrzym'));
            clone.querySelector('.nieobecni-bulk').addEventListener('click', () => {
                setClubVotes(club.id, 'nieobecni');
            });

            clubsListEl.appendChild(clone);
        });
    }

    function updateClubDOM(clubId) {
        const index = clubsState.findIndex(c => c.id === clubId);
        if (index === -1) return;
        const club = clubsState[index];

        const card = document.querySelector(`.club-card[data-club-id="${clubId}"]`);
        if (!card) return;

        card.querySelector('.club-size-input').value = club.size;
        card.querySelector('.input-za').value = club.za;
        card.querySelector('.input-przeciw').value = club.przeciw;
        card.querySelector('.input-wstrzym').value = club.wstrzym;
        card.querySelector('.input-nieobecni').value = club.nieobecni;

        // Logical border coloring: if a club votes entirely the same (excluding absent members),
        // adding a class to the card so CSS can outline it.
        card.classList.remove('club-all-za', 'club-all-przeciw', 'club-all-wstrzym');

        const votingMembers = club.size - club.nieobecni;
        if (votingMembers > 0) {
            if (club.za === votingMembers) card.classList.add('club-all-za');
            else if (club.przeciw === votingMembers) card.classList.add('club-all-przeciw');
            else if (club.wstrzym === votingMembers) card.classList.add('club-all-wstrzym');
        }
    }

    // ==== LOGIC ====
    function handleSizeChange(clubId, newSize) {
        if (newSize < 0) newSize = 0;
        const club = clubsState.find(c => c.id === clubId);
        if (club) {
            club.size = newSize;
            rebalanceClubVotes(club);
            updateClubDOM(clubId);
            calculateResults();
        }
    }

    function handleVoteChange(clubId, type, val) {
        const club = clubsState.find(c => c.id === clubId);
        if (!club) return;

        if (val < 0) val = 0;
        club[type] = val;

        rebalanceClubVotes(club, type);
        updateClubDOM(clubId);
        calculateResults();
    }

    function rebalanceClubVotes(club, changedType = null) {
        let total = club.za + club.przeciw + club.wstrzym + club.nieobecni;
        if (total > club.size) {
            let over = total - club.size;
            const tryReduce = (prop) => {
                if (changedType === prop || over <= 0) return;
                if (club[prop] >= over) { club[prop] -= over; over = 0; }
                else { over -= club[prop]; club[prop] = 0; }
            };
            tryReduce('wstrzym');
            tryReduce('nieobecni');
            tryReduce('przeciw');
            tryReduce('za');

            // If still over (means they manually typed > size), reduce the changedType
            if (over > 0 && changedType) {
                club[changedType] -= over;
            }
        } else if (total < club.size) {
            let diff = club.size - total;
            if (changedType === 'nieobecni') {
                club.wstrzym += diff;
            } else {
                club.nieobecni += diff;
            }
        }
    }

    function setClubVotes(clubId, type) {
        const club = clubsState.find(c => c.id === clubId);
        if (!club) return;

        club.za = 0; club.przeciw = 0; club.wstrzym = 0; club.nieobecni = 0;

        if (type !== 'nieobecni') {
            club[type] = club.size;
        } else {
            club.nieobecni = club.size;
        }

        updateClubDOM(clubId);
        calculateResults();
    }

    function resetVotes() {
        clubsState.forEach(club => {
            const baseAbs = club.baseAbsent || 0;
            club.za = 0;
            club.przeciw = 0;
            club.wstrzym = club.size - baseAbs;
            club.nieobecni = baseAbs;
            updateClubDOM(club.id);
        });
        calculateResults();
    }

    function calculateResults() {
        let _za = 0, _przeciw = 0, _wstrzym = 0, _nieobecni = 0, _size = 0;

        clubsState.forEach(c => {
            _za += c.za;
            _przeciw += c.przeciw;
            _wstrzym += c.wstrzym;
            _nieobecni += c.nieobecni;
            _size += c.size;
        });

        const present = _za + _przeciw + _wstrzym;
        const passedTypes = majorityTypes[majoritySelect.value];
        const isQuorum = present >= passedTypes.quorumReq;

        // Update DOM stats
        totalZaEl.textContent = _za;
        totalPrzeciwEl.textContent = _przeciw;
        totalWstrzymEl.textContent = _wstrzym;
        totalNieobecniEl.textContent = _nieobecni;
        totalSeatsCountEl.textContent = `Suma mandatów: ${_size}`;

        // Quorum bar
        const qPercent = Math.min(100, (present / _size) * 100);
        quorumBar.style.width = `${qPercent}%`;
        quorumText.textContent = `Kworum: ${present} / ${_size} (Wymagane: ${passedTypes.quorumReq})`;
        if (!isQuorum) {
            quorumWarning.style.display = 'block';
            quorumBar.style.backgroundColor = 'var(--color-danger)';
        } else {
            quorumWarning.style.display = 'none';
            quorumBar.style.backgroundColor = 'var(--color-primary)';
        }

        // Evaluate
        thresholdInfo.textContent = passedTypes.description;

        let reqZa = passedTypes.calculateThreshold(_za, _przeciw, _wstrzym);
        if (present === 0) reqZa = 1; // avoid / 0 logic if any division happens

        if (_za >= reqZa && isQuorum) {
            resultStatus.textContent = "PRZYJĘTO";
            resultStatus.className = "result-status passed";
            if (majoritySelect.value === 'zwykla') {
                votesDiff.textContent = `Więcej głosów ZA niż PRZECIW`;
            } else if (majoritySelect.value === 'bezwzgledna') {
                votesDiff.textContent = `Wymagana bezwzględna większość osiągnięta`;
            } else if (majoritySelect.value === '3/5') {
                votesDiff.textContent = `Wymagane 3/5 głosów osiągnięte`;
            } else if (majoritySelect.value === '2/3') {
                votesDiff.textContent = `Wymagane 2/3 głosów osiągnięte`;
            }
        } else {
            resultStatus.textContent = "ODRZUCONO";
            resultStatus.className = "result-status failed";
            if (!isQuorum) {
                votesDiff.textContent = "Brak Kworum!";
            } else {
                votesDiff.textContent = `Brakuje: ${Math.max(0, reqZa - _za)} głosów ZA`;
            }
        }

        // Unified progress bar logic (relative to 'present' voters)
        if (present > 0) {
            const pZa = (_za / present) * 100;
            const pPrzeciw = (_przeciw / present) * 100;
            const pWstrzym = (_wstrzym / present) * 100;

            barZa.style.width = `${pZa}%`;
            barPrzeciw.style.width = `${pPrzeciw}%`;
            barWstrzym.style.width = `${pWstrzym}%`;

            const reqPercent = (reqZa / present) * 100;
            // Place threshold line relative to present. Since 'Za' bar grows from left to right,
            // we want the line to be placed where Za needs to reach.
            thresholdLine.style.left = `${Math.min(100, reqPercent)}%`;
            thresholdLine.style.display = 'block';
        } else {
            barZa.style.width = '0%';
            barPrzeciw.style.width = '0%';
            barWstrzym.style.width = '0%';
            thresholdLine.style.display = 'none';
        }
    }

    // RUN
    init();
});
