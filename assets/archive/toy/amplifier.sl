# Amplifier stage: a weak signal made strong, but only as strong as the
# power supply allows.
#
# Domain: electrical engineering, one transistor stage driving a speaker.
# Shape: two inputs meeting in one process (signal plus power), with a
# loss on the power side.
#
# Microphone    sends a weak audio signal, 0.2 units a tick (information).
# Supply        is the power rail, 4 units a tick (energy).
# Supply Line   is the power connector and the resistance between the
#               rail and the stage (Impeding, impedance 0.25). It also
#               serves as the power-side interface. It holds back a
#               quarter of the power, so the stage sees 3 (the other 1 is
#               lost as heat).
# Stage         is the transistor (Amplifying, gain 5). Its output is
#               min(signal x gain, power reaching it).
# Speaker       receives the amplified signal as power (energy). The power
#               the stage takes in but does not pass on is waste heat: at
#               gain 5 the stage takes 3, sends 1 and dissipates 2.
# Input Jack and Output Jack are the pass-ways the signal crosses.
#
# Knobs to try:
#   - the stage gain (5). At gain 5 the output is 0.2 x 5 = 1. Raise it to
#     20 and the output wants 4 but is capped (clipped) at the 3 the
#     supply line lets through.
#   - the supply line impedance (0.25). Raise it to 0.9 and only 0.4 of
#     power reaches the stage, so even gain 5 clips at 0.4.
system "Amplifier Stage" : Concrete/Technical

domain "a one-stage audio amplifier"

time unit tick

source Microphone
    description "The weak audio signal coming in."
source Supply
    description "The power rail."
sink Speaker
    description "What the stage drives."

interface "Input Jack"
    description "Where the microphone plugs in."
interface "Output Jack"
    description "Where the speaker plugs in."
component "Supply Line" primitive Impeding impedance 0.25 interface
    description "The resistance between the rail and the stage; holds back a quarter of the power."
component Stage primitive Amplifying gain 5
    description "The transistor: multiplies the signal by its gain, never past the power it is fed."

flow Microphone -> "Input Jack" : informational "audio in" amount 0.2
flow "Input Jack" -> Stage : informational "audio in"
flow Supply -> "Supply Line" : energy "rail power" substance power amount 4
flow "Supply Line" -> Stage : energy "stage power" substance power
flow Stage -> "Output Jack" : energy "audio out" substance power
flow "Output Jack" -> Speaker : energy "audio out" substance power

metric "signal delivered" : sum into Speaker

@lens mobus
