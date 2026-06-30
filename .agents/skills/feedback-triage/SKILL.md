---
name: feedback-triage
description: Triage les feedbacks Filon en production via Convex CLI, avec notification utilisateur obligatoire. À utiliser quand il faut lire les feedbacks ouverts, les passer en in_progress ou done, et confirmer au client qu'on l'écoute.
disable-model-invocation: true
---

# Feedback triage

Traite les feedbacks Filon en prod avec un chemin unique, pour éviter les oublis côté service client.

## Objectif

Quand un feedback utilisateur est trié depuis le terminal :
- lire les feedbacks ouverts sur la prod
- décider honnêtement entre `new`, `in_progress`, `done`
- **toujours notifier l'utilisateur** quand on le passe en `in_progress` ou `done`
- vérifier ensuite la table `feedback` et la table `notifications`

## Règle d'or

Ne jamais faire un simple changement de statut silencieux.

Si tu touches un feedback en prod :
1. tu mets à jour le statut
2. tu crées la notification in-app associée
3. tu vérifies le résultat

## Commandes de lecture

Lister les feedbacks prod :

```powershell
pnpm exec convex data feedback --prod
```

Lister les notifications récentes :

```powershell
pnpm exec convex data notifications --prod --limit 10
```

## Commandes d'écriture

### Mettre un feedback en cours

Utiliser `admin:opsSetFeedbackStatus` avec un payload JSON5 inline :

```powershell
pnpm exec convex run admin:opsSetFeedbackStatus --prod "{id:'<feedbackId>',status:'in_progress',adminNote:'<note admin claire>'}"
```

### Marquer un feedback traité

```powershell
pnpm exec convex run admin:opsSetFeedbackStatus --prod "{id:'<feedbackId>',status:'done',adminNote:'<note admin claire>'}"
```

### Notifier l'utilisateur

Créer ensuite la notification explicite :

```powershell
pnpm exec convex run notifications:create --prod "{userId:'<userId>',kind:'product_update',title:'Feedback pris en compte',body:'<message utilisateur>',actionUrl:'<route optionnelle>',actionLabel:'<label optionnel>',meta:'{\"feedbackId\":\"<feedbackId>\",\"status\":\"in_progress\"}'}"
```

Pour un feedback résolu, préférer :

```powershell
pnpm exec convex run notifications:create --prod "{userId:'<userId>',kind:'feedback_resolved',title:'Feedback traité',body:'<message utilisateur>',actionUrl:'<route optionnelle>',actionLabel:'<label optionnel>',meta:'{\"feedbackId\":\"<feedbackId>\",\"status\":\"done\"}'}"
```

## Décision de triage

- `new` : pas encore lu ou pas assez clair
- `in_progress` : besoin confirmé, bug reproduit ou chantier produit réellement pris en charge
- `done` : déjà livré ou effectivement corrigé en prod

Ne jamais mettre `done` pour “bonne idée plus tard”.

## Chemin recommandé

1. Lire `feedback`
2. Identifier les retours encore `new`
3. Pour chaque retour, écrire une `adminNote` courte et exploitable
4. Passer le statut au bon niveau
5. Créer la notification utilisateur adaptée
6. Relire `feedback` et `notifications`

## Note importante

Le backend Filon contient déjà une logique de notification liée au changement de statut admin. Même si elle existe, conserver cette vérification CLI tant que le flux ops n'a pas été revalidé en prod sur un vrai cas.
