# Graph Report - reiflick-renovacao-v2  (2026-06-24)

## Corpus Check
- 9 files · ~3,708 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 44 nodes · 88 edges · 7 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `sendAbandonedCartMessage()` - 10 edges
2. `validateWhatsAppPhoneNumber()` - 9 edges
3. `resolvePhoneForMultchats()` - 8 edges
4. `sendTemplateMessage()` - 8 edges
5. `getFirstName()` - 6 edges
6. `sendCanceladosMessage()` - 6 edges
7. `sendRenovacaoMessage()` - 6 edges
8. `sendPurchaseMessage()` - 6 edges
9. `handler()` - 6 edges
10. `handler()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `normalizePhoneNumber()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-renovacao.js
- `resolvePhoneForMultchats()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-cancelados.js
- `resolvePhoneForMultchats()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-renovacao.js
- `sendAbandonedCartMessage()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-cancelados.js
- `sendCanceladosMessage()` --calls--> `handler()`  [INFERRED]
  lib\multchats\wabaMultchats.js → pages\api\send-cancelados.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.42
Nodes (9): formatMultchatsError(), getAuthHeaders(), postSendMessage(), resolvePhoneForMultchats(), sendCanceladosMessage(), sendPurchaseMessage(), sendTemplateMessage(), sendTextMessage() (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.6
Nodes (5): buildAbandonedCartTemplateParams(), buildCanceladosTemplateParams(), buildPurchaseTemplateParams(), buildRenovacaoTemplateParams(), getFirstName()

### Community 2 - "Community 2"
Cohesion: 0.6
Nodes (5): cleanPhone(), handler(), messageTemplate(), sendEmail(), sendToMultchats()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (4): handler(), resolvePayload(), resolvePhone(), sendRenovacaoMessage()

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (4): handler(), resolvePayload(), normalizeBrazilianMobilePhone(), normalizePhoneNumber()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): buildAbandonedCartAutomationMessage(), isBrokenTemplateError(), resolveTemplateConfig(), sendAbandonedCartMessage()

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): prepareMessageForMultchatsAutomation(), sendAutomationWebhook()

## Knowledge Gaps
- **Thin community `Community 8`** (2 nodes): `prepareMessageForMultchatsAutomation()`, `sendAutomationWebhook()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handler()` connect `Community 3` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `handler()` connect `Community 4` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `resolvePhoneForMultchats()` connect `Community 0` to `Community 8`, `Community 1`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `resolvePhoneForMultchats()` (e.g. with `handler()` and `handler()`) actually correct?**
  _`resolvePhoneForMultchats()` has 2 INFERRED edges - model-reasoned connections that need verification._