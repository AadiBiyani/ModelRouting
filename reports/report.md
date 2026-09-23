# Model routing benchmark

Batch ID: `4193423d-3887-45cd-b6ce-52de1fa55b02`  
Pricing date: 2026-09-22  
Task count: 7

| Policy | Passed | Success rate | Cloud calls | Tasks using cloud | API cost | Cost per success | Total time | Mean time/task |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| local-only | 6/7 | 85.7% | 0 | 0.0% | $0.000000 | $0.000000 | 43.69 s | 6.24 s |
| cloud-only | 7/7 | 100.0% | 7 | 100.0% | $0.015462 | $0.002209 | 20.93 s | 2.99 s |
| routed | 7/7 | 100.0% | 3 | 42.9% | $0.008884 | $0.001269 | 41.77 s | 5.97 s |

Cloud cost includes every attempt with reported token usage, including failed validation. Local inference has zero provider API fees; local compute cost is excluded. Costs are unavailable if cloud prices or token counts are missing.

Passing means the implementation compiled and passed the predefined tests. These checks do not establish general correctness. This small benchmark describes observed outcomes and cannot establish statistical equivalence in success rate.

## Task outcomes

| Task | Local only | Cloud only | Routed |
| --- | --- | --- | --- |
| count-words | pass (local: passed) | pass (cloud: passed) | pass (cloud: passed) |
| is-palindrome | pass (local: passed) | pass (cloud: passed) | pass (cloud: passed) |
| merge-sorted | pass (local: passed) | pass (cloud: passed) | pass (local: passed) |
| normalize-whitespace | pass (local: passed) | pass (cloud: passed) | pass (local: passed) |
| parse-csv-line | fail (local: tests_failed) | pass (cloud: passed) | pass (local: tests_failed → cloud: passed) |
| top-k-frequent | pass (local: passed) | pass (cloud: passed) | pass (local: passed) |
| unique-numbers | pass (local: passed) | pass (cloud: passed) | pass (local: passed) |
