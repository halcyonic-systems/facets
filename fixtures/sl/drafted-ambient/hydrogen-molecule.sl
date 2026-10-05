system "Hydrogen Molecule" : Concrete/Chemical
domain "molecular structure and chemical bonding"
component "Nucleus A" primitive Propelling interface
    description "One proton: a point positive charge that both attracts the shared electrons and repels the other nucleus."
component "Nucleus B" primitive Propelling interface
    description "The second proton, identical to the first; the pair defines the bond axis."
component "Electron Pair" primitive Combining interface
    description "Two spin-paired electrons in the sigma bonding orbital, delocalised over both nuclei. Their shared density is what holds the two protons in one body; it is also what absorbs and emits light and what a reaction partner negotiates with."
component "Vibrational Mode" primitive Buffering interface
    description "The stretching degree of freedom along the bond axis: the store that holds energy delivered by collision as oscillation of the internuclear distance, and gives it back on the next collision."
environment "Surrounding Gas"
    description "The body of gas the molecule sits in: the other molecules it collides with, which supplied the two hydrogen atoms and take back kinetic energy."
environment "Radiation Field"
    description "The electromagnetic field around the molecule — photons arrive from it and emitted photons depart into it."
sink "Oxygen Molecule"
    description "A reaction partner that eventually takes both hydrogen atoms; stands for whatever oxidant, catalyst surface or acceptor consumes this molecule."
flow "Surrounding Gas" -> "Nucleus A" : matter "hydrogen atom"
    description "Formation: a free H atom arrived from the gas phase, bringing one proton and one electron."
flow "Surrounding Gas" -> "Nucleus B" : matter "hydrogen atom"
    description "The second free H atom; pairing their electrons released about 436 kJ per mole into the gas."
flow "Radiation Field" -> "Electron Pair" : energy "absorbed photon"
    description "Ultraviolet quanta promote the pair toward antibonding states; infrared quanta are taken up only weakly, since the symmetric molecule has no dipole."
flow "Electron Pair" -> "Radiation Field" : energy "emitted photon"
    description "Radiative relaxation back to the ground configuration — the waste channel for electronic excitation."
flow "Surrounding Gas" -> "Vibrational Mode" : energy "collisional kick"
    description "Kinetic energy transferred inward when a neighbouring molecule strikes this one."
flow "Vibrational Mode" -> "Surrounding Gas" : energy "collisional recoil"
    description "Energy handed back to the gas; over many collisions this is how the molecule stays in thermal equilibrium with its surroundings."
flow "Nucleus A" -> "Electron Pair" : field "nuclear attraction"
flow "Nucleus B" -> "Electron Pair" : field "nuclear attraction"
flow "Electron Pair" -> "Nucleus A" : field "binding pull"
    description "The accumulated electron density between the protons pulls each nucleus inward — the bond itself, seen from one end."
flow "Electron Pair" -> "Nucleus B" : field "binding pull"
flow "Nucleus A" -> "Nucleus B" : field "Coulomb repulsion"
    description "Proton-proton repulsion, balanced against the binding pull at roughly 74 picometres."
flow "Electron Pair" -> "Vibrational Mode" : energy "restoring force"
    description "The bond behaves as a stiff spring; its curvature sets the vibrational frequency the mode can hold."
flow "Vibrational Mode" -> "Nucleus A" : energy "oscillation"
    description "Stored stretch energy appears as periodic displacement of the nuclei along the axis."
flow "Vibrational Mode" -> "Nucleus B" : energy "oscillation"
flow "Nucleus A" -> "Oxygen Molecule" : matter "hydrogen atom"
    description "On reaction the molecule is consumed and this atom is incorporated into the product."
flow "Nucleus B" -> "Oxygen Molecule" : matter "hydrogen atom"
flow "Electron Pair" -> "Oxygen Molecule" : energy "bond energy"
    description "The product: the energy stored in the shared pair, released when the electrons are re-paired into stronger bonds with the acceptor."

@lens mobus
@pos "Nucleus A" 479.3709 188.38081
@pos "Nucleus B" 650 320
@pos "Electron Pair" 480 490
@pos "Vibrational Mode" 310 320.00003
@pos "Surrounding Gas" -113.83969 41.172787
@pos "Radiation Field" 733.43677 836.0429
@pos "Oxygen Molecule" 1314.5924 56.028286
