# Google Play — deklaration av bakgrundsplats

Det här underlaget beskriver epaRadars användning av `ACCESS_BACKGROUND_LOCATION` inför
Play Console-deklarationen. Formuleringen ska stämmas av mot Googles aktuella formulär innan
publicering.

## Vilken kärnfunktion kräver bakgrundsplats?

Frivillig, vänner-begränsad platsdelning på livekartan. Användaren kan låta accepterade vänner
se var användaren befinner sig även när epaRadar inte visas på skärmen. Funktionen används för
att hitta varandra vid körning och meetups, vilket är en central del av appens community- och
meetupfunktion.

## Varför räcker inte plats när appen används?

När appen ligger i bakgrunden skulle enbart platsåtkomst medan appen används sluta uppdatera
vännens position. Då skulle livekartan visa en gammal eller missvisande plats just när
användaren kör till eller deltar i en meetup. Bakgrundsplats behövs för att uppdatera den
frivilligt delade positionen under dessa tillfällen.

## Hur aktiveras funktionen?

Platsdelning är avstängd som standard. Användaren trycker själv på `Dela min plats` i
Inställningar, godkänner först platsåtkomst medan appen används och därefter Androids
bakgrundsbehörighet. Appen visar en foreground-service-notis medan bakgrundsdelningen är aktiv.
Användaren kan stänga av delningen i Inställningar eller återkalla behörigheten i Androids
inställningar.

## Vem kan se platsen?

Endast användarens accepterade vänner enligt appens åtkomstregler. Platsen är inte offentlig,
visas inte för utloggade besökare och delas inte med andra användare som inte är vänner.

## Hur används platsen?

Platsen används för:

- vännens liveposition på kartan när platsdelning är aktiverad,
- kartans egen position,
- frivilliga meetup-check-ins inom meetupens geofence.

Platsen säljs inte och används inte för annonsering eller profilering.

## Tydlig information i appen

Inställningsskärmen säger att vänner kan se användarens position på kartan, att ingen annan kan
se den och att delningen kan stängas av när som helst. Android-konfigurationen beskriver också
att epaRadar visar användarens plats för vänner på kartan när bakgrundsdelning är aktiverad.

## Säkerhet och minderåriga

epaRadar riktar sig till ungdomar i EPA-traktorålder. Platsdelning kräver ett aktivt val,
är vänner-begränsad och är inte offentlig. Detta är en communityfunktion, inte en
övervakningsfunktion; användaren kan när som helst stänga av den.

