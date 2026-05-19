TECHNICAL PROPOSAL AND CONTRACTING FRAMEWORK
DIACONÍA & MOIRŨ DIGITAL ECOSYSTEM
Master document for the evaluation, contracting and onboarding of technology providers
───── ❖ ─────
Version 4.0 — Consolidated document
Issue date: May 9, 2026
 
Table of Contents
1. Executive Summary	4
Key project facts	4
Strategic differentiators	4
What we expect from the provider	5
2. Context, Vision and Objectives	6
2.1. Context	6
2.2. Vision	6
2.3. Project objectives	6
3. Scope of the Digital Ecosystem	7
3.1. Diaconía Financial App	7
3.2. Moirũ App	7
3.3. Blockchain Infrastructure and DIACOIN	7
3.4. Back-Office, Marketplace and Integrations	8
4. Technology Architecture	9
4.1. System layers	9
4.2. Architectural principles	10
5. Functional and Non-Functional Requirements	11
5.1. Functional requirements — Diaconía App	11
5.2. Functional requirements — Moirũ App	11
5.3. Non-functional requirements (cross-cutting)	12
6. Key Technical Specifications	13
6.1. Offline-First and synchronization	13
6.2. Tokenomics and Smart Contracts	13
6.3. Self-Sovereign Identity (SSI)	13
6.4. APIs and third-party integrations	13
6.5. Security, privacy and compliance (Law 6534/20)	14
6.6. Inclusive UX/UI	14
7. Data Governance Model — IRT Index	15
8. Stakeholders and RACI Matrix	16
9. Schedule and Implementation Phases	17
10. Requested Pricing Structure	18
10.1. Implementation costs (CAPEX)	18
10.2. Recurring costs (OPEX)	18
10.3. Proposed payment structure	19
10.4. Assumptions, exclusions and dependencies	19
11. Provider Evaluation Criteria	20
11.1. Weighted matrix	20
11.2. Critical evaluation points	20
11.3. Knock-out criteria	21
12. Key Contractual Conditions	22
12.1. Intellectual property	22
12.2. Confidentiality and personal data	22
12.3. Service Level Agreements (SLA)	22
12.4. Warranty, support and escrow	22
12.5. Knowledge transfer	22
12.6. Compliance, audit and security	23
12.7. Penalties and dispute resolution	23
13. Process, Terms and Next Steps	24
13.1. Selection process schedule	24
13.2. Deliverables requested from the provider	24
13.3. Process terms	24
14. Annexes	25
Annex A — Glossary	25
Annex B — Applicable regulatory framework	25
Annex C — Point of contact	25

 
1. Executive Summary
Diaconía AdP is driving a high-impact social transformation through a bimodal digital ecosystem composed of the Diaconía Financial App and the Moirũ App, both interconnected through a permissioned Blockchain network and articulated by the DIACOIN utility token. The model breaks the paradigm of traditional microfinance by introducing the “Effort Tokenization” concept: the client’s social, educational and behavioral capital is converted into a verifiable financial asset that reduces credit risk and deepens financial inclusion.
This document consolidates, in a single piece, the strategic vision, the technical architecture, the functional and non-functional requirements, the supplier evaluation criteria, the contractual model and the expected pricing structure. Its purpose is to serve as the single reference document so that qualified providers can size, propose and implement the solution under equivalent and comparable conditions.
Key project facts
Dimension	Definition
Scope	Two native mobile apps (Diaconía + Moirũ), web back-office, B2B2C marketplace, permissioned blockchain with DIACOIN, and connectors to the Core Banking system, Bancard and SIPAP.
Architectural model	Cloud-native microservices, API-first (OpenAPI 3.0), Offline-First with CRDT-based synchronization and BLE/Wi-Fi Direct mesh network.
Compliance	Personal Data Protection Law 6534/20 (Paraguay), applicable BCP/SUBANCO regulations, OWASP MASVS, ISO 27001 as a reference.
Languages	Bilingual interface Spanish / English ; WCAG 2.1 Level AA accessibility.
Target timeline	12 months to a productive MVP + 6 months of stabilization (reference plan; the provider must propose its own plan).
Contracting model	Milestone-based contract (UAT) with intellectual property 100% owned by the Client and source code held in Escrow.
Strategic differentiators
•	Self-Sovereign Identity (SSI): verifiable credentials owned by the client and portable between institutions.
•	Mesh synchronization: validation of payments in areas without coverage through Bluetooth Low Energy and Wi-Fi Direct.
•	B2B2C Marketplace: a network of allied merchants that redeem DIACOIN for productive inputs and services.
•	Predictive Resilience Assistant: advanced analytics that anticipates crises in solidarity groups before they affect delinquency.
•	Non-speculative tokenomics: DIACOIN is minted through Proof of Learning and burned through real usage, avoiding volatility and misalignments.
What we expect from the provider
We are looking for a technology partner (not merely an implementer) able to demonstrate maturity in regulated Fintech, permissioned Blockchain, offline-first engineering, and agile delivery with measurable quality. The selection will prioritize verifiable experience, methodological clarity, knowledge transfer to the internal team, and post-go-live sustainability.
 
2. Context, Vision and Objectives
2.1. Context
Diaconía AdP operates in a country with high rural dispersion, low sustained connectivity in peri-urban and rural areas, and a customer base that combines heterogeneous digital literacy with a strong culture of group cooperation (solidarity loans). The Paraguayan financial system has consolidated local payment gateways (Electronic Payment Service Provider  (EPSP), SIP) and a personal data protection regulatory framework (Law 6534/20) whose compliance is a licensing requirement.
2.2. Vision
To position Diaconía as a regional benchmark for Social Fintech through a digital ecosystem that converts learning and solidarity behavior into tangible financial value. The ecosystem must operate with banking-grade reliability, traceable on-chain transparency, and real inclusion (offline, accessible).
2.3. Project objectives
1.	Build and implement the Diaconía & Moirũ Digital Ecosystem (mobile apps, back-office and blockchain) under a single integrated contract, with intellectual property fully owned by Diaconía.
2.	Enable secure, offline-tolerant and auditable financial transactions, integrated with the Core Banking system, the Electronic Payment Means Processors and SIP.
3.	Operationalize the DIACOIN token as a utility instrument for interest-rate reduction, liquid collateral and redemption in the partner marketplace.
4.	Deliver the Resilience and Talent Index (IRT) as a new scoring engine that combines transactional, educational and behavioral data.
5.	Ensure knowledge transfer to Diaconía’s internal IT team and a sustainable operating model post go-live.
 
3. Scope of the Digital Ecosystem
The ecosystem is composed of four major functional blocks, all of them covered by this proposal. The provider must price the entire scope described herein; any exclusion must be declared explicitly and justified technically.
3.1. Diaconía Financial App
•	Hybrid wallet: custody of Guaranis (PYG) and a non-custodial wallet for digital assets (DIACOIN).
•	Offline-First functionality with CRDT-based synchronization and an encrypted local database (SQLite/Realm).
•	Individual and group loans with digital signatures coordinated through Smart Contracts.
•	Mesh synchronization: P2P data exchange via Bluetooth/Wi-Fi Direct to validate payments in areas without coverage.
•	QR and NFC payments, top-ups and collections through integration with Bancard and SIPAP.
•	Push notifications, SMS and WhatsApp Business as fallback channels.
3.2. Moirũ App
•	Education engine (LMS) compatible with SCORM and xAPI, with progressive download and offline visualization.
•	Talent Mining: software oracle that validates educational progress and triggers DIACOIN minting.
•	In-app AI counseling: a proprietary AI assistant available 24/7 that offers conversational financial, educational and well-being guidance to clients, with safe-fallback rules and human-handoff triggers.
•	Online scheduling and video counseling: when the AI determines that human attention is needed — or when the client requests it — the app allows booking an appointment online and holds the session with a human counselor via video (WebRTC) directly inside the app.
•	Virtual counseling through WebRTC with codecs optimized for low bandwidth (AV1 / H.265), with audio-only fallback on weak networks.
•	Self-Sovereign Identity (SSI) with verifiable credentials registered on the blockchain.
•	Gamification based on levels, badges and redeemable “Talents”.
•	Diaconía Legacy: tokenized referral program through which clients who bring their children, family members or friends into the Diaconía ecosystem receive bonuses and rewards — credit-history boost, preferential interest rates and access to special loans — credited on-chain in DIACOIN once the referral’s onboarding and activity are verified.
 
3.3. Blockchain Infrastructure and DIACOIN
•	Permissioned Hyperledger Besu network, compatible with the EVM/Ethereum ecosystem, with near-zero transaction costs.
•	Smart Contracts in Solidity (or Java/Kotlin if justified) for: group guarantees, mint/burn of DIACOIN, marketplace contracts and SSI credential registry.
•	Software oracles to bridge data from Moirũ and the Core Banking system into the blockchain.
•	DIACOIN as a non-speculative utility token: minting by Proof of Learning, burning by real redemption.
3.4. Back-Office, Marketplace and Integrations
•	Web back-office for operators: portfolio management, loan approval, collections, parameterization, audit and BI.
•	B2B2C Marketplace: portal and SDK for partner merchants that accept DIACOIN.
•	Connectors with the Core Banking system (asynchronous accounting synchronization), Electronic Payment Means Processors (Bancard, vPOS, Infonet, collections) and SIP (interbank transfers).
•	Public API documented with OpenAPI 3.0 for future third-party integrations.
 
4. Technology Architecture
The solution must be built under a cloud-native microservices architecture, with API-first principles, security by design, end-to-end observability and clear separation between layers. The following diagram presents the expected reference model.
 
Figure 1. Reference architecture of the Diaconía & Moirũ Digital Ecosystem.
4.1. System layers
Layer	Responsibility	Reference technologies
1 — Client	Mobile apps (Diaconía and Moirũ), web back-office and merchant portal.	Flutter or React Native, React/Angular, PWA, encrypted local storage (SQLite/Realm).
2 — API Gateway and Identity	Request orchestration, authentication, traffic control and observability.	Kong/APISIX/AWS API Gateway, Auth0 or Keycloak (OAuth2/OIDC), Prometheus, Grafana, OpenTelemetry.
3 — Business microservices	Wallet, Credit, LMS, Counseling, Sync/CRDT, Notifications, SSI, Marketplace, Risk, BI, Audit.	Java (Spring Boot), Kotlin, Node.js (NestJS) or Go. Messaging: Kafka/RabbitMQ.
4A — Blockchain	Immutable ledger, smart contracts and DIACOIN tokenomics.	Hyperledger Besu, Solidity, Truffle/Hardhat, proprietary oracles.
4B — Data and integrations	Persistence, banking integrations and external channels.	PostgreSQL, Redis, S3-compatible Object Storage, Core Banking, Bancard, SIPAP, WhatsApp Business API.
4.2. Architectural principles
•	API-first: every service exposes versioned OpenAPI 3.0 contracts before implementation.
•	Cloud-native: containers (Docker), orchestration (Kubernetes), infrastructure as code (Terraform).
•	Offline-First: the client is sovereign over its local state; the server reconciles with CRDTs.
•	Security by design: secret management (Vault/KMS), end-to-end encryption, principle of least privilege.
•	Observability: structured logs, RED metrics (Rate-Errors-Duration) and distributed tracing across 100% of microservices.
•	Idempotency and resilience: exponential retries, circuit breakers and compensation queues for financial operations.
 
5. Functional and Non-Functional Requirements
5.1. Functional requirements — Diaconía App
ID	Requirement	Priority
RF-D-01	Registration and KYC onboarding with document capture, facial biometrics and validation against PEP/sanctions lists.	Critical
RF-D-02	Hybrid wallet with PYG and DIACOIN balances, transaction history and automatic categorization.	Critical
RF-D-03	Request, approval and disbursement of individual and group loans, with an offline flow tolerant to failures.	Critical
RF-D-04	Coordinated digital signature of guarantees through Smart Contracts (100% threshold before disbursement).	Critical
RF-D-05	QR/NFC payments, intra/interbank transfers (SIPAP) and Bancard collections.	Critical
RF-D-06	BLE/Wi-Fi Direct mesh synchronization for the validation of payments without coverage.	High
RF-D-07	Push notifications, SMS and WhatsApp Business with automatic fallback.	High
RF-D-08	Redemption of DIACOIN for rate reduction, micro-insurance or limit increase.	High
5.2. Functional requirements — Moirũ App
ID	Requirement	Priority
RF-M-01	LMS course catalog with SCORM/xAPI and detailed offline progress tracking.	Critical
RF-M-02	Visualization / progressive download of multimedia content, persistence and resumption.	Critical
RF-M-03	WebRTC virtual counseling with AV1/H.265 codecs and audio-only mode on weak networks.	Critical
RF-M-04	Talent Oracle: on-chain validation of achievements and triggering of DIACOIN minting.	Critical
RF-M-05	Self-Sovereign Identity: issuance, presentation and revocation of verifiable credentials.	High
RF-M-06	Gamification: levels, badges, group ranking and seasonal challenges.	High
RF-M-07	B2B2C Marketplace: partner merchants and DIACOIN redemption.	High
RF-M-08	In-app AI counseling: proprietary conversational assistant for financial, educational and well-being guidance, with safe-fallback rules, content guardrails and automatic human-handoff triggers.	Critical
RF-M-09	Online appointment scheduling with human counselors and in-app video session (WebRTC), including reminders, calendar synchronization and rescheduling/cancellation flow.	Critical
RF-M-10	Diaconía Legacy: tokenized referral program that rewards clients with DIACOIN, credit-history boost, preferential rates or special loans for bringing children, family members or friends into the ecosystem, with on-chain verification of the referral’s onboarding and activity, plus a configurable rules engine.	High
5.3. Non-functional requirements (cross-cutting)
Attribute	Objective	Metric
Availability	Critical financial services always available.	≥ 99.9% monthly (≤ 43 min downtime).
Latency	Smooth perceived response under rural conditions.	P95 < 800 ms in API, P99 < 1.5 s.
Capacity	Support 5-year growth.	500,000 active users / 50 sustained TPS.
Security	Compliance with Law 6534/20 and OWASP MASVS L1.	Annual pentest with no open critical findings.
Privacy	Personal data protected and minimized.	Anonymization in BI pipelines, documented retention.
Recovery (RTO/RPO)	Continuity in the event of major incidents.	RTO ≤ 4 h · RPO ≤ 15 min.
Maintainability	Sustainable and auditable code.	Test coverage ≥ 70% in business logic.
Observability	Proactive detection and diagnosis.	MTTD ≤ 5 min · MTTR ≤ 30 min in major incidents.
Accessibility	Real inclusion.	WCAG 2.1 AA verified · 100% Spanish/English support.
 
6. Key Technical Specifications
6.1. Offline-First and synchronization
•	Encrypted local persistence with SQLite or Realm; keys are never stored in plain text and are derived with a KDF (PBKDF2/Argon2id) anchored to biometrics/device.
•	Conflict resolution with CRDTs, ensuring that group-loan signatures are not lost if members synchronize at different times.
•	Selective synchronization: prioritization of transactional data (small) over multimedia; download resumption and controlled back-pressure.
•	BLE/Wi-Fi Direct mesh synchronization with cryptographic verification between devices to validate payments without cellular coverage.
6.2. Tokenomics and Smart Contracts
•	DIACOIN is a non-speculative utility token. It is not offered, traded or transferred outside the authorized ecosystem.
•	Mint: triggered by oracles when the client completes modules in Moirũ or attends counseling sessions.
•	Burn: triggered when the client redeems DIACOIN for benefits (e.g. a 1% monthly interest-rate reduction).
•	Group guarantee contracts: Smart Contracts block disbursement until 100% of the digital signatures are recorded on the blockchain.
•	On-chain audit: every status change of the loan and of the SSI credentials is recorded immutably.
6.3. Self-Sovereign Identity (SSI)
•	W3C DID and Verifiable Credentials standards for portable credentials (educational, credit-related and identity).
•	Credential wallet integrated into the client app; the institution acts as issuer and verifier.
•	Revocation managed through an on-chain registry, with support for selective presentations (ZKP in the future).
6.4. APIs and third-party integrations
•	OpenAPI 3.0 (Swagger) documentation, versioned and published in a developer portal.
•	Native integration with Bancard (vPOS, Infonet collections) and SIPAP (interbank transfers).
•	Webhooks for notifications and fallback to SMS/WhatsApp Business API in the absence of data.
•	Asynchronous connector with the Core Banking system for accounting status synchronization and reconciliation.
6.5. Security, privacy and compliance (Law 6534/20)
•	Encryption: TLS 1.3 in transit; AES-256 at rest (including the local database).
•	Secret management: Vault or managed KMS; automatic rotation and separation of duties.
•	OWASP MASVS L1 as a minimum on mobile apps; SAST and DAST integrated into CI/CD.
•	Anonymization and pseudonymization of data in BI and predictive analytics.
•	Full audit of privileged access; immutable on-chain record of the loan lifecycle.
•	Privacy by design: register of processing activities, versioned consents and mechanisms to exercise data-subject rights (ARCO).
6.6. Inclusive UX/UI
•	Intuitive iconography, consistent color scheme (payment statuses) and guided onboarding.
•	Bilingual Spanish/English support across 100% of the texts, including notifications and error messages.
•	Adjustable font size, screen readers, high contrast and future voice navigation.
•	Design centered on people with low digital literacy: generous typography, explanatory micro-interactions, assisted mode.
7. Data Governance Model — IRT Index
The Resilience and Talent Index (IRT) is a next-generation score that replaces traditional scoring focused solely on payments. It combines transactional, educational and solidarity-behavior data, all of them auditable and explainable.
Dimension	Weight	Source	Notes
Transactional data	40%	Diaconía App + Core Banking	Punctuality, frequency, tenure, repayment capacity.
Training data	30%	Moirũ App (LMS + oracle)	Completed courses, depth, assessment of comprehension.
Solidarity behavior	20%	Group Smart Contracts	Group punctuality, mutual support, history of guarantees.
Predictive analytics	10%	Risk & AI Service	Psychometrics, leadership and early signals of financial stress.
Every decision derived from the IRT must be explainable (XAI): the system must be able to justify to the client — in plain language — why they obtained that score and which actions would improve it.
 
8. Stakeholders and RACI Matrix
The following matrix delimits responsibilities throughout the project lifecycle. R = Responsible for executing, A = Accountable / approves, C = Consulted, I = Informed.
Activity	Diaconía (Business)	Diaconía (IT)	Provider	Auditor / Compliance	Bancard / SIPAP
Definition of vision and scope	A	C	C	I	I
Architecture design	C	A	R	C	I
Software development	I	C	R/A	I	I
Smart Contracts and tokenomics	C	A	R	C	I
Core / Bancard / SIPAP integration	I	A	R	I	C
UAT testing	A	R	C	I	I
Pentest and security audit	I	A	C	R	I
Training and knowledge transfer	C	A	R	I	I
Post go-live operation	I	A/R	R (support)	C	I
 
9. Schedule and Implementation Phases
The following schedule is referential: the provider must present its own detailed plan, grounded in its actual delivery capacity. A milestone-based plan with verifiable UAT deliverables is required.
Phase	Month	Main deliverables	Payment milestone
F0 — Inception	M1	Discovery, prioritized backlog, detailed architecture, master plan, definition of DoD.	5%
F1 — Technical foundation	M2–M3	DevSecOps platform, IaC, API Gateway, identity, microservices skeleton, Besu network and wallets.	15%
F2 — Financial core	M4–M6	Wallet, individual and group loans, Core Banking and Bancard integration.	25%
F3 — Moirũ and tokenomics	M7–M9	SCORM/xAPI LMS, WebRTC counseling, oracles, mint/burn DIACOIN, SSI.	25%
F4 — Mesh, marketplace and BI	M10	Mesh synchronization, B2B2C marketplace, anonymized BI, predictive assistant.	10%
F5 — UAT, pentest and go-live	M11–M12	End-to-end UAT, pentest, hardening, training, productive go-live.	15%
F6 — Stabilization and support	M13–M18	Operational warranty, improvements, optimization, formal knowledge transfer.	5%
 
10. Requested Pricing Structure
Every provider must submit its quotation following the structure described below. The objective is to ensure real comparability between proposals and traceability of every cost component. Prices must be presented in Guaranis (PYG) and, optionally, in USD at a reference exchange rate.
10.1. Implementation costs (CAPEX)
Component	Expected description	Unit
Discovery and architecture	Inception sessions, detailed architecture, prioritized backlog, master plan.	Lump sum
Diaconía App development	Mobile front-end, financial integrations, offline module.	Per milestone
Moirũ App development	LMS, counseling, gamification, SSI.	Per milestone
Backend microservices	Wallet, Credit, Sync, Notifications, BI, Risk, Audit.	Per milestone
Blockchain and Smart Contracts	Besu network, contracts, tokenomics, oracles.	Per milestone
Back-office and marketplace	Web portals, merchant SDK.	Per milestone
QA, automation and pentest	Functional, non-functional and security testing.	Lump sum
DevSecOps and initial infrastructure	IaC, pipelines, observability, hardening.	Lump sum
10.2. Recurring costs (OPEX)
Component	Expected description	Frequency
Corrective support	Incidents and bugs covered by warranty and SLA.	Monthly
Evolutionary support	Improvements, new features, optimization.	Monthly / hour bank
Operations and monitoring	NOC, observability, on-call, incident management.	Monthly
Third-party licenses	Auth, communications, tools, commercial modules.	Annual
Cloud infrastructure	Compute, storage, network, backups, DR.	Monthly
10.3. Proposed payment structure
•	Payments tied to formal acceptance (UAT) of each milestone by the Client.
•	Maximum advance of 10% upon contract signature; balance distributed across milestones.
•	Penalty for delays attributable to the provider: 1% of the milestone value per week of delay, capped at 10%.
•	Optional bonus for substantial early delivery without sacrificing quality: up to 3% of the milestone.
•	5% retention released at the end of the warranty period.
10.4. Assumptions, exclusions and dependencies
The provider must explicitly state every assumption made in its quotation, declared exclusions, and critical dependencies (Client deliverables, third-party licenses, access, environments). Any undocumented ambiguity will be assumed as included in the scope.
 
11. Provider Evaluation Criteria
Proposals will be evaluated through a weighted matrix that combines technical, commercial and governance capabilities. The contract will be awarded to the provider with the best value/risk ratio, not necessarily the one with the lowest price.
11.1. Weighted matrix
Axis	Criterion	Weight
Technical capability (50%)	Verifiable experience in regulated Fintech and offline-first apps.	15%
Technical capability	Mastery of permissioned Blockchain and Smart Contracts in production.	10%
Technical capability	Quality of the proposed architecture and traceability with the requirements.	15%
Technical capability	Maturity in security (OWASP MASVS, Law 6534/20) and observability.	10%
Delivery capability (20%)	Assigned team, senior profiles, effective dedication and credible plan.	10%
Delivery capability	Methodology, tools, agile governance and risk management.	10%
Commercial (20%)	Reasonableness of prices, transparency and comparability of the offer.	15%
Commercial	Sustainability of the OPEX model and post go-live support terms.	5%
Governance and references (10%)	Verifiable success cases, customer references and financial soundness.	10%
11.2. Critical evaluation points
•	Technical resilience: demonstrated ability in handling data conflicts in environments without internet.
•	Blockchain expertise: experience with permissioned networks and Smart Contract logic (Solidity/Java).
•	Financial security: compliance with Law 6534/20 and OWASP standards for mobile apps.
•	Interoperability: experience integrating Core Banking systems and local payment systems (Bancard / SIPAP).
•	Quality culture: test coverage, CI/CD automation, mature DevSecOps practices.
11.3. Knock-out criteria
6.	Absence of at least two verifiable cases of Fintech or digital banking in production within the last 36 months.
7.	Inability or refusal to accept the clause assigning 100% of intellectual property to the Client and the source-code Escrow.
8.	Documented breach in previous projects for reasons attributable to the provider in the last 24 months.
9.	Lack of locatable team capacity or support during Paraguayan business hours.
 
12. Key Contractual Conditions
The following clauses constitute essential conditions of the contract. Their acceptance is a requirement to participate in the process. Any observation must be presented during the clarification phase.
12.1. Intellectual property
Diaconía AdP will own 100% of the rights over the developed software, including source code, technical documentation, UX/UI designs, scoring algorithms (including the IRT), Smart Contracts and deployment private keys. The provider may not reuse, sublicense or disclose such elements without express authorization.
12.2. Confidentiality and personal data
The provider undertakes to maintain absolute confidentiality regarding customer data, infrastructure and processes, signing an NDA before the start of the process. It will process all personal data in accordance with Law 6534/20 and as a data processor, with explicit sub-processor clauses.
12.3. Service Level Agreements (SLA)
Severity	Description	Response time	Resolution time
Sev 1 — Critical	Outage of financial transactions or data exposure.	≤ 30 min	≤ 4 h
Sev 2 — High	Key functionality degraded with no alternative.	≤ 2 h	≤ 1 business day
Sev 3 — Medium	Functionality affected with workaround available.	≤ 8 h	≤ 3 business days
Sev 4 — Low	Minor improvements and documentation.	≤ 1 business day	Scheduled
12.4. Warranty, support and escrow
•	Minimum 12-month warranty post go-live for bug correction at no additional cost.
•	Detailed support plan with operational metrics (MTTD, MTTR) and monthly reporting.
•	Deposit of source code and critical documentation in an Escrow with an independent third party.
•	Documented continuity and reversibility plan in case of contract termination.
12.5. Knowledge transfer
•	Formal training to Diaconía’s internal IT team throughout the project life and at closing.
•	Living documentation (in repository) and complete operational manuals as a condition of final acceptance.
•	Pair-programming sessions and architectural reviews with the Client’s engineers.
12.6. Compliance, audit and security
•	Right of the Client to audit the provider’s security practices, code and processes with reasonable prior notice.
•	Mandatory reporting of security incidents within 24 hours of detection.
•	Documented adherence to OWASP MASVS and to Diaconía’s internal policies.
12.7. Penalties and dispute resolution
•	Penalty for SLA breach: discount on monthly OPEX, tabulated by severity.
•	Penalty for attributable delay: 1% of the milestone value per week, capped at 10%.
•	Dispute resolution through mediation and, failing that, arbitration in Asunción under Paraguayan law.
 
13. Process, Terms and Next Steps
13.1. Selection process schedule
Stage	Deadline	Responsible
Delivery of the document to the invited provider	D + 0	Diaconía
Clarification period (written questions)	D + 7	Providers
Answers and possible technical visit	D + 12	Diaconía
Reception of technical and commercial proposals	D + 21	Providers
Evaluation, interviews and technical tests	D + 28	Diaconía
Notification of awarding and contract signature	D + 35	Both parties
Kickoff	D + 42	Both parties
13.2. Deliverables requested from the provider
•	Narrative technical proposal (max. 40 pages) covering architecture, team, methodology and risks.
•	Quotation structured according to Section 10, with a milestone-by-milestone breakdown and explicit assumptions.
•	High-level project plan with schedule, milestones and dependencies.
•	Verifiable success cases (minimum 2) with contactable references.
•	Summary CV of the key team that would be assigned to the project (no unilateral substitutions).
•	Express acceptance of the key contractual conditions (Section 12) or, failing that, specific and reasoned observations.
13.3. Process terms
•	Confidentiality: this document is delivered under NDA and may not be shared with third parties without authorization.
•	Diaconía reserves the right to declare the process void if no offer is satisfactory.
•	This call does not generate any obligation to award the contract or to pay any expenses incurred by bidders.
•	All official communications must be channeled in writing to the designated point of contact.
 
14. Annexes
Annex A — Glossary
Term	Definition
CRDT	Conflict-free Replicated Data Type — a data structure that replicates without conflicts.
SSI / DID / VC	Self-Sovereign Identity, Decentralized Identifier and Verifiable Credentials (W3C standards).
Hyperledger Besu	Enterprise Ethereum client for permissioned networks with EVM support.
Oracle	Component that connects off-chain data with the blockchain.
Code Escrow	Deposit of the source code with a third party to guarantee continuity.
IRT	Resilience and Talent Index — multidimensional score of Diaconía.
SCORM / xAPI	Standards for the packaging and tracking of educational content.
MASVS	Mobile Application Security Verification Standard (OWASP).
Annex B — Applicable regulatory framework
•	Law 6534/20 — Personal Data Protection (Paraguay).
•	Applicable BCP regulations for financial entities and means of payment.
•	Law 1015/97 and amendments — Anti-Money Laundering (AML/CFT).
•	Best practices: ISO 27001, ISO 27701, OWASP ASVS and MASVS, NIST Cybersecurity Framework.
Annex C — Point of contact
For all queries related to this proposal, providers must address the official channel designated by the Technology Department of Diaconía AdP. Answers will be shared with all bidders in a homogeneous manner, preserving the fairness of the process.
