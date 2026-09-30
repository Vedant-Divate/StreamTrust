# Phase 6 verification — FHIR export & validation

## What was built

- `scripts/generate-fhir-terminology.ts` + generated `CodeSystem`s (6 +
  27 concepts), six per-indicator `ValueSet`s, three
  `StructureDefinition`s under `public/fhir/`.
- Pure mappers: Location, Practitioner (no name), Device, Observation
  (survey, compound value codes incl. `-not_applicable`, note template
  - waiver sentence), Provenance (author always, informant when a
    suggestion exists, coded extensions or D-07 reason text).
- `build-bundle.ts`: 15-entry transaction Bundle, `urn:uuid` links;
  refuses drafts and incomplete assessments.
- `validator-client.ts`: HAPI `$validate`, OperationOutcome summary
  (fatal/error vs warning), network failures → typed errors.
- Routes: `GET .../fhir` (submitted only), `POST .../fhir/validate`
  (stores `fhir_exports`, returns counts + issues).
- Done page: Bundle viewer, HAPI validate button with public-server
  notice, summarized result + issue list, both downloads.
- `docs/fhir-mapping.md` + ADR-0005 (project-defined mapping record).

## Commands run and output (abbreviated, real)

$ pnpm fhir:terminology
Wrote terminology for base http://localhost:3000/fhir
Indicators: 6, value concepts: 27

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — 0 errors, 1 warning (known `_input` note)
$ vitest run — Test Files 23 passed (23), Tests 133 passed (133)
incl. fhir-basics (4), fhir-obs-prov (7: note template, waiver,
N/A codes, agents, extensions, D-07 fallback), bundle (3: 15 entries,
referential integrity, draft refusal), fhir routes (4: Bundle shape,
409/404/403, stored counts, 502 path)
$ next build — fhir + fhir/validate routes registered

D-07 probe (real extensions first, as required):
$ pnpm dlx tsx ./probe-fhir.tmp.ts
entries: 15
HTTP 200 ms=1350 counts= {"warning":27,"information":10}

Zero errors. The 10 `information` findings are HAPI's "Unknown
extension ..." notices for our three custom URLs; the 27 warnings are
12× unknown-CodeSystem (localhost canonicals HAPI cannot fetch) and
15× dom-6 narrative suggestions. Unknown-extension appears at
_information_ level only — D-07's error trigger never fired, so the
extensions ship as-is; the fallback path stays implemented and
unit-tested. No deviation ADR needed.

photo_waived representation: `Photo: none provided (waiver recorded).`
appended to all six `Observation.note` texts when waived (probe Bundle
below shows it); not coded — no standard element fits (ADR-0005,
fhir-mapping.md).

## Bundle JSON (real, from a submitted assessment, demo data)

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "fullUrl": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf",
      "resource": {
        "resourceType": "Location",
        "id": "3cecf8df-b1a9-4c72-9695-544f89c328cf",
        "status": "active",
        "mode": "instance",
        "name": "Probe Creek",
        "physicalType": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
              "code": "si",
              "display": "Site"
            }
          ]
        },
        "position": {
          "longitude": 77.5946,
          "latitude": 12.9716
        }
      },
      "request": {
        "method": "POST",
        "url": "Location"
      }
    },
    {
      "fullUrl": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63",
      "resource": {
        "resourceType": "Practitioner",
        "id": "6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63",
        "active": true,
        "identifier": [
          {
            "system": "http://localhost:3000/fhir/volunteer-id",
            "value": "d5da024e-ed3b-4b09-a7f1-58a4489f6553"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Practitioner"
      }
    },
    {
      "fullUrl": "urn:uuid:d2b6af7c-62df-441e-a13a-320253227c93",
      "resource": {
        "resourceType": "Device",
        "id": "d2b6af7c-62df-441e-a13a-320253227c93",
        "status": "active",
        "deviceName": [
          {
            "name": "meta/llama-3.2-11b-vision-instruct",
            "type": "model-name"
          }
        ],
        "type": {
          "text": "AI vision model"
        },
        "version": [
          {
            "value": "v1"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Device"
      }
    },
    {
      "fullUrl": "urn:uuid:14cdb6be-b2ea-4e49-ae43-22747a59d28a",
      "resource": {
        "resourceType": "Observation",
        "id": "14cdb6be-b2ea-4e49-ae43-22747a59d28a",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "clarity"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "clarity-muddy"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: human_override. AI suggested: cloudy (medium). Evidence: Grey haze over the channel. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:cbec4431-221a-4b28-b09d-9cf59ab75961",
      "resource": {
        "resourceType": "Provenance",
        "id": "cbec4431-221a-4b28-b09d-9cf59ab75961",
        "target": [
          {
            "reference": "urn:uuid:14cdb6be-b2ea-4e49-ae43-22747a59d28a"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          },
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "informant"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:d2b6af7c-62df-441e-a13a-320253227c93"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "human_override"
          },
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/ai-suggested-value",
            "valueCode": "cloudy"
          },
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/ai-confidence-band",
            "valueCode": "medium"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    },
    {
      "fullUrl": "urn:uuid:f6953b2f-a459-40a4-aaa7-3c47e4dcb63f",
      "resource": {
        "resourceType": "Observation",
        "id": "f6953b2f-a459-40a4-aaa7-3c47e4dcb63f",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "color"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "color-brown"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: ai_accepted. AI suggested: brown (high). Evidence: Brown tint. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:e71b4a1e-8583-43fa-968f-44382814e6a0",
      "resource": {
        "resourceType": "Provenance",
        "id": "e71b4a1e-8583-43fa-968f-44382814e6a0",
        "target": [
          {
            "reference": "urn:uuid:f6953b2f-a459-40a4-aaa7-3c47e4dcb63f"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          },
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "informant"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:d2b6af7c-62df-441e-a13a-320253227c93"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "ai_accepted"
          },
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/ai-suggested-value",
            "valueCode": "brown"
          },
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/ai-confidence-band",
            "valueCode": "high"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    },
    {
      "fullUrl": "urn:uuid:f15993b3-7ed3-480f-81ac-6ca397bbf3a2",
      "resource": {
        "resourceType": "Observation",
        "id": "f15993b3-7ed3-480f-81ac-6ca397bbf3a2",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "algae"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "algae-patches"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: human_only. AI suggested: none (n/a). Evidence: n/a. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:674de9fa-1c9b-4eae-93d5-c2913491dee3",
      "resource": {
        "resourceType": "Provenance",
        "id": "674de9fa-1c9b-4eae-93d5-c2913491dee3",
        "target": [
          {
            "reference": "urn:uuid:f15993b3-7ed3-480f-81ac-6ca397bbf3a2"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "human_only"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    },
    {
      "fullUrl": "urn:uuid:b42d7376-3874-4d7b-a9cc-a08492493345",
      "resource": {
        "resourceType": "Observation",
        "id": "b42d7376-3874-4d7b-a9cc-a08492493345",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "litter"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "litter-some"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: human_only. AI suggested: none (n/a). Evidence: n/a. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:32faec2a-0d89-4fe3-9fd1-e9200231b423",
      "resource": {
        "resourceType": "Provenance",
        "id": "32faec2a-0d89-4fe3-9fd1-e9200231b423",
        "target": [
          {
            "reference": "urn:uuid:b42d7376-3874-4d7b-a9cc-a08492493345"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "human_only"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    },
    {
      "fullUrl": "urn:uuid:423226c3-ecdc-4c79-8458-f513fb3f2e30",
      "resource": {
        "resourceType": "Observation",
        "id": "423226c3-ecdc-4c79-8458-f513fb3f2e30",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "flow"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "flow-slow"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: human_only. AI suggested: none (n/a). Evidence: n/a. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e",
      "resource": {
        "resourceType": "Provenance",
        "id": "621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e",
        "target": [
          {
            "reference": "urn:uuid:423226c3-ecdc-4c79-8458-f513fb3f2e30"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "human_only"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    },
    {
      "fullUrl": "urn:uuid:0bf4ec54-f542-4819-9559-e7bb618859d0",
      "resource": {
        "resourceType": "Observation",
        "id": "0bf4ec54-f542-4819-9559-e7bb618859d0",
        "status": "final",
        "category": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "survey",
                "display": "Survey"
              }
            ]
          }
        ],
        "code": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator",
              "code": "odor"
            }
          ]
        },
        "subject": {
          "reference": "urn:uuid:3cecf8df-b1a9-4c72-9695-544f89c328cf"
        },
        "effectiveDateTime": "2026-09-30T08:00:00.000Z",
        "performer": [
          {
            "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
          }
        ],
        "valueCodeableConcept": {
          "coding": [
            {
              "system": "http://localhost:3000/fhir/CodeSystem/stream-indicator-value",
              "code": "odor-earthy"
            }
          ]
        },
        "note": [
          {
            "text": "Decision: human_only. AI suggested: none (n/a). Evidence: n/a. Photo: none provided (waiver recorded)."
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Observation"
      }
    },
    {
      "fullUrl": "urn:uuid:0d65edd5-4360-4286-b7ce-05c0cb485f44",
      "resource": {
        "resourceType": "Provenance",
        "id": "0d65edd5-4360-4286-b7ce-05c0cb485f44",
        "target": [
          {
            "reference": "urn:uuid:0bf4ec54-f542-4819-9559-e7bb618859d0"
          }
        ],
        "recorded": "2026-09-30T11:26:25.590Z",
        "activity": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
              "code": "CREATE"
            }
          ]
        },
        "agent": [
          {
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
                  "code": "author"
                }
              ]
            },
            "who": {
              "reference": "urn:uuid:6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63"
            }
          }
        ],
        "extension": [
          {
            "url": "http://localhost:3000/fhir/StructureDefinition/decision-source",
            "valueCode": "human_only"
          }
        ]
      },
      "request": {
        "method": "POST",
        "url": "Provenance"
      }
    }
  ]
}
```

## OperationOutcome (real, live HAPI validator)

Error/warning counts: **0 errors, 27 warnings** (+ 10 information).

```json
{
  "resourceType": "OperationOutcome",
  "text": {
    "status": "generated",
    "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\"><h1>Operation Outcome</h1><table border=\"0\"><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[0].resource/*Location/3cecf8df-b1a9-4c72-9695-544f89c328cf*/, Line[1] Col[437]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[1].resource/*Practitioner/6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63*/, Line[1] Col[758]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[2].resource/*Device/d2b6af7c-62df-441e-a13a-320253227c93*/, Line[1] Col[1108]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.code, Line[1] Col[1551]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#clarity'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.value.ofType(CodeableConcept), Line[1] Col[1879]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#clarity-muddy'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/, Line[1] Col[2035]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[0], Line[1] Col[2944]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[1], Line[1] Col[3041]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-suggested-value</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[2], Line[1] Col[3138]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-confidence-band</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/, Line[1] Col[3140]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.code, Line[1] Col[3585]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#color'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.value.ofType(CodeableConcept), Line[1] Col[3911]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#color-brown'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/, Line[1] Col[4045]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[0], Line[1] Col[4951]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[1], Line[1] Col[5047]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-suggested-value</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[2], Line[1] Col[5142]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-confidence-band</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/, Line[1] Col[5144]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.code, Line[1] Col[5589]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#algae'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.value.ofType(CodeableConcept), Line[1] Col[5917]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#algae-patches'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/, Line[1] Col[6041]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/.extension[0], Line[1] Col[6758]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/, Line[1] Col[6760]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.code, Line[1] Col[7206]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#litter'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.value.ofType(CodeableConcept), Line[1] Col[7532]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#litter-some'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/, Line[1] Col[7656]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/.extension[0], Line[1] Col[8373]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/, Line[1] Col[8375]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.code, Line[1] Col[8819]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#flow'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.value.ofType(CodeableConcept), Line[1] Col[9143]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#flow-slow'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/, Line[1] Col[9267]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/.extension[0], Line[1] Col[9984]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/, Line[1] Col[9986]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.code, Line[1] Col[10430]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#odor'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.value.ofType(CodeableConcept), Line[1] Col[10756]]</td><td>CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#odor-earthy'</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/, Line[1] Col[10880]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr><tr><td style=\"font-weight: bold;\">INFORMATION</td><td>[Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/.extension[0], Line[1] Col[11597]]</td><td>Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source</td></tr><tr><td style=\"font-weight: bold;\">WARNING</td><td>[Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/, Line[1] Col[11599]]</td><td>Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)</td></tr></table></div>"
  },
  "issue": [
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 437
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[0].resource/*Location/3cecf8df-b1a9-4c72-9695-544f89c328cf*/",
        "Line[1] Col[437]"
      ],
      "expression": ["Bundle.entry[0].resource/*Location/3cecf8df-b1a9-4c72-9695-544f89c328cf*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 758
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[1].resource/*Practitioner/6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63*/",
        "Line[1] Col[758]"
      ],
      "expression": [
        "Bundle.entry[1].resource/*Practitioner/6ca8cc35-bd35-4f6d-b6c0-ba9e67455b63*/"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 1108
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[2].resource/*Device/d2b6af7c-62df-441e-a13a-320253227c93*/",
        "Line[1] Col[1108]"
      ],
      "expression": ["Bundle.entry[2].resource/*Device/d2b6af7c-62df-441e-a13a-320253227c93*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 1551
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#clarity'",
      "location": [
        "Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.code",
        "Line[1] Col[1551]"
      ],
      "expression": [
        "Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 1879
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#clarity-muddy'",
      "location": [
        "Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.value.ofType(CodeableConcept)",
        "Line[1] Col[1879]"
      ],
      "expression": [
        "Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 2035
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/",
        "Line[1] Col[2035]"
      ],
      "expression": ["Bundle.entry[3].resource/*Observation/14cdb6be-b2ea-4e49-ae43-22747a59d28a*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 2944
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[0]",
        "Line[1] Col[2944]"
      ],
      "expression": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 3041
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-suggested-value",
      "location": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[1]",
        "Line[1] Col[3041]"
      ],
      "expression": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[1]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 3138
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-confidence-band",
      "location": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[2]",
        "Line[1] Col[3138]"
      ],
      "expression": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/.extension[2]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 3140
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/",
        "Line[1] Col[3140]"
      ],
      "expression": ["Bundle.entry[4].resource/*Provenance/cbec4431-221a-4b28-b09d-9cf59ab75961*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 3585
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#color'",
      "location": [
        "Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.code",
        "Line[1] Col[3585]"
      ],
      "expression": [
        "Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 3911
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#color-brown'",
      "location": [
        "Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.value.ofType(CodeableConcept)",
        "Line[1] Col[3911]"
      ],
      "expression": [
        "Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 4045
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/",
        "Line[1] Col[4045]"
      ],
      "expression": ["Bundle.entry[5].resource/*Observation/f6953b2f-a459-40a4-aaa7-3c47e4dcb63f*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 4951
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[0]",
        "Line[1] Col[4951]"
      ],
      "expression": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 5047
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-suggested-value",
      "location": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[1]",
        "Line[1] Col[5047]"
      ],
      "expression": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[1]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 5142
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/ai-confidence-band",
      "location": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[2]",
        "Line[1] Col[5142]"
      ],
      "expression": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/.extension[2]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 5144
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/",
        "Line[1] Col[5144]"
      ],
      "expression": ["Bundle.entry[6].resource/*Provenance/e71b4a1e-8583-43fa-968f-44382814e6a0*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 5589
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#algae'",
      "location": [
        "Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.code",
        "Line[1] Col[5589]"
      ],
      "expression": [
        "Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 5917
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#algae-patches'",
      "location": [
        "Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.value.ofType(CodeableConcept)",
        "Line[1] Col[5917]"
      ],
      "expression": [
        "Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 6041
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/",
        "Line[1] Col[6041]"
      ],
      "expression": ["Bundle.entry[7].resource/*Observation/f15993b3-7ed3-480f-81ac-6ca397bbf3a2*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 6758
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/.extension[0]",
        "Line[1] Col[6758]"
      ],
      "expression": [
        "Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 6760
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/",
        "Line[1] Col[6760]"
      ],
      "expression": ["Bundle.entry[8].resource/*Provenance/674de9fa-1c9b-4eae-93d5-c2913491dee3*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 7206
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#litter'",
      "location": [
        "Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.code",
        "Line[1] Col[7206]"
      ],
      "expression": [
        "Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 7532
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#litter-some'",
      "location": [
        "Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.value.ofType(CodeableConcept)",
        "Line[1] Col[7532]"
      ],
      "expression": [
        "Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 7656
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/",
        "Line[1] Col[7656]"
      ],
      "expression": ["Bundle.entry[9].resource/*Observation/b42d7376-3874-4d7b-a9cc-a08492493345*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 8373
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/.extension[0]",
        "Line[1] Col[8373]"
      ],
      "expression": [
        "Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 8375
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/",
        "Line[1] Col[8375]"
      ],
      "expression": ["Bundle.entry[10].resource/*Provenance/32faec2a-0d89-4fe3-9fd1-e9200231b423*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 8819
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#flow'",
      "location": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.code",
        "Line[1] Col[8819]"
      ],
      "expression": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 9143
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#flow-slow'",
      "location": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.value.ofType(CodeableConcept)",
        "Line[1] Col[9143]"
      ],
      "expression": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 9267
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/",
        "Line[1] Col[9267]"
      ],
      "expression": [
        "Bundle.entry[11].resource/*Observation/423226c3-ecdc-4c79-8458-f513fb3f2e30*/"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 9984
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/.extension[0]",
        "Line[1] Col[9984]"
      ],
      "expression": [
        "Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 9986
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/",
        "Line[1] Col[9986]"
      ],
      "expression": ["Bundle.entry[12].resource/*Provenance/621b48b8-6fde-4bc6-8eee-8eeb01d2ff8e*/"]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 10430
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator for 'http://localhost:3000/fhir/CodeSystem/stream-indicator#odor'",
      "location": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.code",
        "Line[1] Col[10430]"
      ],
      "expression": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.code"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 10756
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Terminology_PassThrough_TX_Message"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Terminology_PassThrough_TX_Message"
          }
        ]
      },
      "diagnostics": "CodeSystem is unknown and can't be validated: http://localhost:3000/fhir/CodeSystem/stream-indicator-value for 'http://localhost:3000/fhir/CodeSystem/stream-indicator-value#odor-earthy'",
      "location": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.value.ofType(CodeableConcept)",
        "Line[1] Col[10756]"
      ],
      "expression": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/.value.ofType(CodeableConcept)"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 10880
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/",
        "Line[1] Col[10880]"
      ],
      "expression": [
        "Bundle.entry[13].resource/*Observation/0bf4ec54-f542-4819-9559-e7bb618859d0*/"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 11597
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "Extension_EXT_Unknown"
        }
      ],
      "severity": "information",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "Extension_EXT_Unknown"
          }
        ]
      },
      "diagnostics": "Unknown extension http://localhost:3000/fhir/StructureDefinition/decision-source",
      "location": [
        "Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/.extension[0]",
        "Line[1] Col[11597]"
      ],
      "expression": [
        "Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/.extension[0]"
      ]
    },
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-line",
          "valueInteger": 1
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col",
          "valueInteger": 11599
        },
        {
          "url": "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          "valueString": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
        }
      ],
      "severity": "warning",
      "code": "processing",
      "details": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/java-core-messageId",
            "code": "http://hl7.org/fhir/StructureDefinition/DomainResource#dom-6"
          }
        ]
      },
      "diagnostics": "Constraint failed: dom-6: 'A resource should have narrative for robust management' (defined in http://hl7.org/fhir/StructureDefinition/DomainResource) (Best Practice Recommendation)",
      "location": [
        "Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/",
        "Line[1] Col[11599]"
      ],
      "expression": ["Bundle.entry[14].resource/*Provenance/0d65edd5-4360-4286-b7ce-05c0cb485f44*/"]
    }
  ]
}
```

## Commits in this phase

- 3a50178 feat(fhir): generate terminology codesystems from vocab
- beaa021 feat(fhir): add resource mappers for location practitioner device
- e32d1ea feat(fhir): add observation and provenance mappers
- 1f2c74e feat(fhir): add bundle builder
- 5a57cb4 feat(fhir): add validator client and validate route
- f6fb7e3 feat(done): add fhir bundle viewer and validation ui
- 4328d38 docs(fhir): add ADR-0005 and fhir mapping document
