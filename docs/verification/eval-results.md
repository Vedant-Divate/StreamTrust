# AI evaluation results (smoke test)

> Small sample, team-labelled; a smoke test, not a benchmark.

- Date: 2026-10-01T03:28:52.545Z
- Provider: nim, model: meta/llama-3.2-11b-vision-instruct, prompt: v1
- Images: 22, labels: 107
- Decided: 73, agreed: 25 (34.2%)
- Abstained: 9, provider errors: 5
- Odor: 0 guessed values on all 22 images (labels.csv holds no odor rows by design). Of 17 images with usable suggestions: 13 explicit abstentions (normalizer forces cannot_determine), 4 omitted rows (no suggestion stored, UI shows no panel, submit records human_only). A correctness check, not just a metric.

## Per-indicator agreement

| indicator | decided | agreed | agreement | abstained |
| --------- | ------- | ------ | --------- | --------- |
| algae     | 8       | 3      | 37.5%     | 9         |
| clarity   | 17      | 10     | 58.8%     | 0         |
| color     | 17      | 5      | 29.4%     | 0         |
| flow      | 14      | 1      | 7.1%      | 0         |
| litter    | 17      | 6      | 35.3%     | 0         |

## Mismatches and errors

| algae-01.jpg | litter | label none, got some |
| algae-02.jpg | litter | label none, got some |
| algae-02.jpg | flow | label standing, got slow |
| algae-03.jpg | clarity | label clear, got cloudy |
| algae-03.jpg | color | label green, got brown |
| algae-03.jpg | litter | label none, got some |
| clear-01.jpg | color | label brown, got green |
| clear-02.jpg | clarity | label clear, got slightly_cloudy |
| clear-02.jpg | color | label colorless, got brown |
| clear-02.jpg | algae | label none, got patches |
| clear-02.jpg | litter | label none, got some |
| clear-02.jpg | flow | label fast, got moderate |
| clear-03.jpg | color | label colorless, got brown |
| clear-03.jpg | litter | label none, got some |
| clear-03.jpg | flow | label fast, got moderate |
| clear-04.jpg | odor | omitted row (no suggestion stored; human decides) |
| clear-04.jpg | flow | label fast, got moderate |
| clear-05.jpg | clarity | label clear, got slightly_cloudy |
| clear-05.jpg | color | label colorless, got brown |
| clear-05.jpg | algae | label none, got patches |
| clear-05.jpg | litter | label none, got some |
| clear-05.jpg | flow | label fast, got moderate |
| clear-06.jpg | — | provider error: NIM API error 500. |
| dry-01.jpg | — | provider error: NIM returned unparseable JSON. |
| dry-02.jpg | odor | omitted row (no suggestion stored; human decides) |
| dry-02.jpg | flow | label dry, got moderate |
| dry-02.jpg | clarity | label not_applicable, got clear |
| dry-02.jpg | color | label not_applicable, got green |
| dry-02.jpg | litter | label none, got some |
| dry-03.jpg | flow | label dry, got slow |
| dry-03.jpg | clarity | label not_applicable, got cloudy |
| dry-03.jpg | color | label not_applicable, got brown |
| dry-03.jpg | litter | label none, got some |
| litter-01.jpg | color | label green, got brown |
| litter-01.jpg | algae | label none, got patches |
| litter-01.jpg | flow | label slow, got moderate |
| litter-02.jpg | odor | omitted row (no suggestion stored; human decides) |
| litter-02.jpg | color | label green, got brown |
| litter-02.jpg | flow | label standing, got slow |
| turbid-01.jpg | clarity | label muddy, got cloudy |
| turbid-01.jpg | algae | label none, got patches |
| turbid-01.jpg | litter | label none, got some |
| turbid-01.jpg | flow | label slow, got moderate |
| turbid-03.jpg | — | provider error: NIM returned unparseable JSON. |
| turbid-04.jpg | odor | omitted row (no suggestion stored; human decides) |
| turbid-04.jpg | litter | label none, got some |
| turbid-04.jpg | flow | label standing, got moderate |
| turbid-05.jpg | clarity | label cloudy, got clear |
| turbid-05.jpg | color | label unusual, got green |
| turbid-05.jpg | flow | label fast, got moderate |
| turbid-06.jpg | — | provider error: NIM returned unparseable JSON. |
| turbid-07.jpg | color | label unusual, got brown |
| turbid-07.jpg | algae | label none, got patches |
| turbid-07.jpg | litter | label a_lot, got some |
| turbid-07.jpg | flow | label standing, got slow |
| turbid-08.jpg | color | label unusual, got brown |
| turbid-09.jpg | — | provider error: NIM returned unparseable JSON. |
