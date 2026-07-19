# KAYNAKLAR VE GÜNCELLİK

Bu proje değişebilen mevzuat ve harici API'ler içerir. Canlı kod yazmadan önce resmi dokümanların güncel sürümünü doğrula.

## Codex çalışma biçimi

- AGENTS.md: https://developers.openai.com/codex/agent-configuration/agents-md
- Best practices: https://developers.openai.com/codex/learn/best-practices
- Codex CLI: https://developers.openai.com/codex/cli
- Goals: https://developers.openai.com/codex/use-cases/follow-goals
- Models: https://developers.openai.com/codex/models

## Türkiye

- Ticaret Bakanlığı e-ticaret mevzuatı: https://ticaret.gov.tr/ic-ticaret/elektronik-ticaret/mevzuat
- ETBİS: https://etbis.ticaret.gov.tr/
- KVKK: https://www.kvkk.gov.tr/
- İYS: https://iys.org.tr/
- GİB e-Belge: https://ebelge.gib.gov.tr/
- TCMB ödeme kuruluşları: https://www.tcmb.gov.tr/

## Ödeme

- iyzico Marketplace: https://docs.iyzico.com/en/products/marketplace/marketplace-implementation
- PayTR geliştirici dokümanı: https://dev.paytr.com/

## Kanallar

- Trendyol Developers: https://developers.trendyol.com/tr
- Hepsiburada API Portal: https://developers.hepsiburada.com/tr/
- Amazon SP-API: https://developer-docs.amazon.com/sp-api/

## Teknik

Framework ve kütüphanelerde paket sürümünü hafızadan seçme. Resmi changelog, migration guide ve compatibility tablolarını kontrol et; lockfile ile sabitle.

## Yeniden doğrulama gerektiren kararlar

- ödeme kuruluşunun güncel lisansı,
- komisyon ve vade,
- Trendyol/Hepsiburada/Amazon endpoint sürümü,
- kargo API sözleşmesi,
- e-fatura yükümlülüğü,
- KVKK yurt dışı aktarım modeli,
- ETBİS ve aracılık sözleşmesi yükümlülükleri.
