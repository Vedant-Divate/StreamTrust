# Eval fixture attributions

All 15 photos below were sourced from Wikimedia Commons with a clear,
verifiable open licence per file (checked via the Commons API,
`extmetadata`, on 2026-09-30). Team-labelled in `labels.csv`; no `odor`
labels by design (smell cannot be judged from a photo).

| file          | source page                                                                                                                                | photographer / uploader | licence      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------ |
| clear-01.jpg  | https://commons.wikimedia.org/wiki/File:Crystal_clear_Water_stream.jpg                                                                     | Dbulathwatta            | CC BY-SA 4.0 |
| clear-02.jpg  | https://commons.wikimedia.org/wiki/File:Small_rocky_stream_of_water_1.jpg                                                                  | NeoMeesje               | CC BY-SA 4.0 |
| clear-03.jpg  | https://commons.wikimedia.org/wiki/File:Clear_Stream.jpg                                                                                   | Zakhari Volk            | CC BY-SA 4.0 |
| clear-04.jpg  | https://commons.wikimedia.org/wiki/File:Small_stream_of_water_in_the_mountains.jpg                                                         | Witext                  | CC BY-SA 4.0 |
| turbid-01.jpg | https://commons.wikimedia.org/wiki/File:Big_Muddy_River.jpg                                                                                | David Szoke             | CC BY-SA 4.0 |
| turbid-03.jpg | https://commons.wikimedia.org/wiki/File:Turbulent_River_-_geograph.org.uk_-_993985.jpg                                                     | David Lally             | CC BY-SA 2.0 |
| turbid-04.jpg | https://commons.wikimedia.org/wiki/File:Murky_water_-_geograph.org.uk_-_1768863.jpg                                                        | Sebastian Ballard       | CC BY-SA 2.0 |
| algae-01.jpg  | https://commons.wikimedia.org/wiki/File:Algae_in_snowfed_creek_on_Bennett_Mountain,_Idaho.jpg                                              | Thayne Tuason           | CC BY-SA 4.0 |
| algae-02.jpg  | https://commons.wikimedia.org/wiki/File:Algae_in_Stagnant_Water.jpg                                                                        | Solasly                 | CC BY-SA 4.0 |
| algae-03.jpg  | https://commons.wikimedia.org/wiki/File:Algae_on_Green_Creek.JPG                                                                           | Jakec                   | CC BY-SA 3.0 |
| litter-01.jpg | https://commons.wikimedia.org/wiki/File:Flotsam_and_Jetsam,_River_Ouse_-_geograph.org.uk_-_761336.jpg                                      | Simon Carey             | CC BY-SA 2.0 |
| litter-02.jpg | https://commons.wikimedia.org/wiki/File:Gummilatsche_treibt_auf_der_Wasseroberfl%C3%A4che_der_Donau._Wasserverschmutzung_(48676353753).jpg | Ivan Radic              | CC BY 2.0    |
| dry-01.jpg    | https://commons.wikimedia.org/wiki/File:Dry_river_bed_in_California.jpg                                                                    | gin_e                   | CC BY-SA 2.0 |
| dry-02.jpg    | https://commons.wikimedia.org/wiki/File:Dry_creek_bed_DMCR.jpg                                                                             | Prince Roy              | CC BY 2.0    |
| dry-03.jpg    | https://commons.wikimedia.org/wiki/File:Maules-Creek-NSW-dry.jpg                                                                           | Felix Andrews           | CC BY-SA 3.0 |

Images were downscaled/re-encoded to lightweight JPEGs (all ≤ ~730 KB,
most far smaller) for a fast eval loop; visual content is unchanged.
Two further candidates were examined and deliberately dropped: an
aerial desert photo of the Muddy River (no assessable stream-level
detail) and a lab flat-lay of microplastic fragments (no stream scene).
