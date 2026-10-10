# ── A bank run: fear that feeds on its own result ───────────────────────────
# bench · after Diamond & Dybvig 1983 (bank runs as a coordination failure)
#
# The vault holds 0.9 of the deposits (shares of 1). The teller pays out up to
# 0.2 a day, but only as far as the depositors' nerves allow: the Rumour
# sensor reads the vault (its gain is 0.5), the Nerves comparator reports the
# setpoint minus that reading, and the teller opens by that much. The lower
# the vault, the higher the fear, the faster it empties. With the setpoint at
# 0.5 the fear is already awake at 0.9 and the vault is empty about day 31;
# at 0.46 the reading never drops below the threshold and nothing happens
# beyond the trickle of new deposits. Run or no run is decided by a 0.04 shift
# in one number.
#
# Split form: the window (new deposits) and the counter (withdrawals) are the
# pass-ways; the vault, the teller, the sensor and the comparator are
# residents. The vault is a stock rather than a finite source because the
# sensor can only read a stock. The numbers are round so the ledger reads by
# eye; nothing here is a claim about any bank.
system "Bank Run" : Concrete/Technical

domain "a bank whose depositors withdraw faster as reserves fall"

time unit day

level Structure

interface Window
    description "Where new deposits come in: the savers' side of the branch."
interface Counter
    description "Where cash goes out: the withdrawal counter."

component Vault primitive Buffering stock share initial 0.9 release 0.2
    description "The reserves; the teller may draw up to 0.2 a day."
component Teller primitive Modulating backpressure
    description "Pays out as far as the fear allows; what is not paid stays in the vault."
component Rumour primitive Sensing
    description "Reads the vault without taking from it; its gain is half."
component Nerves primitive Inverting setpoint 0.5
    description "Reports the setpoint minus the reading: low reserves read as high fear."

source Savers
sink Depositors

flow Savers -> Window : matter "new deposits" substance cash amount 0.005 unit "share/day"
flow Window -> Vault : matter "deposits" substance cash
flow Vault -> Teller : matter "cash" substance cash
flow Teller -> Counter : matter "withdrawals" substance cash
flow Counter -> Depositors : matter "withdrawals" substance cash
flow Vault -> Rumour : informational "reserves"
flow Rumour -> Nerves : informational "news"
flow Nerves -> Teller : informational "fear"
param "nerves" : setpoint of Nerves range 0.1..1

param "deposits" : flow Savers -> Window "new deposits" range 0..0.05
param "payout limit" : release of Vault range 0.05..0.5

metric "withdrawn" : sum into Depositors

@lens mobus
