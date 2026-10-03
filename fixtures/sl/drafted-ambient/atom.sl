system "Atom" : Concrete/Physical
domain "atomic structure — nucleus, bound electrons, and their exchanges with the surrounding field and matter"
component Nucleus
    description "Protons and neutrons bound by the residual strong force, with their own level structure, spin and decay modes. Open it to model nucleons, binding energy and radioactivity."
component "Inner Shells" primitive Buffering
    description "Core electrons, tightly bound and chemically inert; they hold charge and screen the nuclear field from the outer electrons."
component "Valence Shell" interface
    description "The outermost occupied orbitals: where photons are absorbed and re-emitted, where electrons are captured or lost, and where bonds are made. Open it to model subshells, orbital shapes, spin pairing and selection rules."
environment "Radiation Field"
    description "The electromagnetic field surrounding the atom — it delivers incident photons and carries away emitted ones."
environment "Neighbouring Atom"
    description "An adjacent atom in the same molecule, lattice or gas; the partner with which valence electrons are shared or traded."
environment "Surrounding Plasma"
    description "The ambient gas of free electrons and ions that the atom draws an electron from when it recombines and returns one to when it is ionised."
component T7
flow Nucleus -> "Inner Shells" : field "Coulomb attraction"
    description "The positive nuclear charge binds the core electrons into their shells."
flow Nucleus -> "Valence Shell" : field "screened attraction"
    description "What reaches the outer electrons is the nuclear charge diminished by the core, the effective nuclear charge."
flow "Inner Shells" -> "Valence Shell" : field "charge screening"
    description "Core electron density cancels part of the nuclear charge and sets the outer binding energies."
flow "Radiation Field" -> "Valence Shell" : energy "absorbed photon"
    description "A photon of matching energy lifts an outer electron to a higher orbital; the atom is excited."
flow "Valence Shell" -> "Radiation Field" : energy "emitted photon"
    description "Radiative decay back to the ground configuration, at the characteristic line energies that make the atom's spectrum."
flow "Surrounding Plasma" -> "Valence Shell" : matter "captured electron"
    description "Recombination: a free electron is bound into a vacant outer orbital."
flow "Valence Shell" -> "Surrounding Plasma" : matter "ejected electron"
    description "Ionisation: an outer electron is driven free, leaving the atom positively charged."
flow "Valence Shell" -> "Neighbouring Atom" : field "shared valence electrons"
    description "The atom's chemical behaviour — electron density offered into a covalent or metallic bond."
flow "Neighbouring Atom" -> "Valence Shell" : field "shared valence electrons"
    description "The reciprocal share received from the partner; the bond is the pair of these flows."
flow "Inner Shells" -> Nucleus "surrounds" mere

@lens mobus
@pos Nucleus 534.8503 195.92482
@pos "Inner Shells" 778.5965 413.13098
@pos "Valence Shell" 332.7757 405
@pos "Radiation Field" 290.64673 -7.9695435
@pos "Neighbouring Atom" -3.488957 294.33987
@pos "Surrounding Plasma" 155.76167 608.03876
@pos T7 488.7097 484.8263
