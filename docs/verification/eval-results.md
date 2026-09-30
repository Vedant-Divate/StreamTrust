# AI evaluation results (smoke test)

> Small sample, team-labelled; a smoke test, not a benchmark.

- Date: 2026-09-30T19:04:39.236Z
- Provider: nim, model: meta/llama-3.2-11b-vision-instruct, prompt: v1
- Images: 22, labels: 107
- Decided: 54, agreed: 27 (50.0%)
- Abstained: 5, provider errors: 10

## Per-indicator agreement

| indicator | decided | agreed | agreement | abstained |
| --------- | ------- | ------ | --------- | --------- |
| algae     | 7       | 3      | 42.9%     | 5         |
| clarity   | 12      | 9      | 75.0%     | 0         |
| color     | 12      | 8      | 66.7%     | 0         |
| flow      | 11      | 1      | 9.1%      | 0         |
| litter    | 12      | 6      | 50.0%     | 0         |

## Mismatches and errors

| algae-01.jpg | — | provider error: NIM returned unparseable JSON. |
| algae-02.jpg | algae | label heavy, got patches |
| algae-02.jpg | litter | label none, got some |
| algae-02.jpg | flow | label standing, got slow |
| algae-03.jpg | — | provider error: NIM returned unparseable JSON. |
| clear-01.jpg | color | label brown, got green |
| clear-02.jpg | flow | label fast, got moderate |
| clear-03.jpg | — | provider error: NIM returned unparseable JSON. |
| clear-04.jpg | flow | label fast, got moderate |
| clear-05.jpg | — | provider error: NIM returned unparseable JSON. |
| clear-06.jpg | color | label colorless, got green |
| clear-06.jpg | algae | label none, got patches |
| clear-06.jpg | flow | label fast, got moderate |
| dry-01.jpg | — | provider error: NIM returned unparseable JSON. |
| dry-02.jpg | flow | label dry, got moderate |
| dry-02.jpg | clarity | label not_applicable, got clear |
| dry-02.jpg | color | label not_applicable, got green |
| dry-02.jpg | algae | label not_applicable, got none |
| dry-03.jpg | — | provider error: NIM returned unparseable JSON. |
| litter-01.jpg | clarity | label cloudy, got clear |
| litter-01.jpg | litter | label some, got none |
| litter-01.jpg | flow | label slow, got moderate |
| litter-02.jpg | clarity | label cloudy, got clear |
| litter-02.jpg | litter | label some, got none |
| litter-02.jpg | flow | label standing, got moderate |
| turbid-01.jpg | litter | label none, got some |
| turbid-01.jpg | flow | label slow, got moderate |
| turbid-03.jpg | litter | label none, got some |
| turbid-03.jpg | flow | label fast, got moderate |
| turbid-04.jpg | algae | label none, got patches |
| turbid-04.jpg | litter | label none, got some |
| turbid-04.jpg | flow | label standing, got moderate |
| turbid-05.jpg | — | provider error: NIM returned unparseable JSON. |
| turbid-06.jpg | — | provider error: NIM returned unparseable JSON. |
| turbid-07.jpg | — | provider error: NIM returned unparseable JSON. |
| turbid-08.jpg | color | label unusual, got brown |
| turbid-09.jpg | — | provider error: NIM returned unparseable JSON. |
