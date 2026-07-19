# FAZ 5 — İPTAL, İADE, UYUŞMAZLIK VE MESAJLAŞMA

## Amaç

Sorunlu siparişlerin izlenebilir, kanıtlı ve rol kontrollü biçimde çözülebilmesi.

## Kapsam

- iptal talebi,
- ReturnRequest/ReturnItem,
- mock tam/kısmi refund,
- stok geri alma kararı,
- Dispute ve EvidenceFile,
- konuşma/mesaj/dosya eki,
- admin karar ekranı,
- audit,
- kötüye kullanım raporu.

## Kabul kriterleri

- kargo öncesi/sonrası kurallar ayrılıyor,
- refund idempotent,
- iade adedi sipariş adedini aşmıyor,
- evidence private,
- taraf olmayan kullanıcı konuşmayı göremiyor,
- finans/admin rolleri doğru,
- E2E iade ve uyuşmazlık geçiyor,
- kalite kapısı geçiyor.
