# Graph Report - reiflick-renovacao-v2  (2026-06-22)

## Corpus Check
- 9 files · ~3,371 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 39 nodes · 68 edges · 8 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]

## God Nodes (most connected - your core abstractions)
1. `normalizePhoneNumber()` - 10 edges
2. `sendTemplateMessage()` - 7 edges
3. `sendCanceladosMessage()` - 6 edges
4. `sendRenovacaoMessage()` - 6 edges
5. `sendPurchaseMessage()` - 6 edges
6. `getFirstName()` - 5 edges
7. `sendAbandonedCartMessage()` - 5 edges
8. `handler()` - 5 edges
9. `handler()` - 5 edges
10. `postSendMessage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `normalizePhoneNumber()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-cancelados.js
- `normalizePhoneNumber()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-renovacao.js
- `sendPurchaseMessage()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-renovacao.js
- `sendCanceladosMessage()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-cancelados.js
- `sendRenovacaoMessage()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-renovacao.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.4
Nodes (5): handler(), resolvePayload(), buildRenovacaoTemplateParams(), resolveRenovacaoPhone(), sendRenovacaoMessage()

### Community 1 - "Community 1"
Cohesion: 0.6
Nodes (5): cleanPhone(), handler(), messageTemplate(), sendEmail(), sendToMultchats()

### Community 2 - "Community 2"
Cohesion: 0.5
Nodes (4): handler(), resolvePayload(), resolveCanceladosPhone(), sendCanceladosMessage()

### Community 3 - "Community 3"
Cohesion: 0.83
Nodes (4): normalizePhoneNumber(), sendPurchaseMessage(), sendTemplateMessage(), sendTextMessage()

### Community 4 - "Community 4"
Cohesion: 0.83
Nodes (3): buildAbandonedCartTemplateParams(), resolveAbandonedCartPhone(), sendAbandonedCartMessage()

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (3): buildCanceladosTemplateParams(), buildPurchaseTemplateParams(), getFirstName()

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): prepareMessageForMultchatsAutomation(), sendAutomationWebhook()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): getAuthHeaders(), postSendMessage()

## Knowledge Gaps
- **Thin community `Community 8`** (2 nodes): `prepareMessageForMultchatsAutomation()`, `sendAutomationWebhook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `getAuthHeaders()`, `postSendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `normalizePhoneNumber()` connect `Community 3` to `Community 0`, `Community 8`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `handler()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `handler()` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `normalizePhoneNumber()` (e.g. with `handler()` and `handler()`) actually correct?**
  _`normalizePhoneNumber()` has 2 INFERRED edges - model-reasoned connections that need verification._