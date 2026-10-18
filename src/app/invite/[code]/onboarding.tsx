"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Steps } from "../steps";
import { RegisterForm } from "./register-form";
import s from "../invite.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

// Черновик текстов; правят основатели.
const ABOUT = [
  {
    title: "Что такое Certa",
    text: "Закрытый круг людей, которые продают, ищут и приобретают ценные вещи: часы, ювелирные изделия, искусство, предметы коллекционирования. Здесь нет случайных людей: каждый участник вступает по приглашению и проходит проверку.",
  },
  {
    title: "Как это устроено",
    text: "Участники выставляют предложения и запросы, видимые только внутри клуба. Перед сделкой предмет проходит экспертизу подлинности. Клуб сопровождает сделку от согласования до передачи, а расчёты проходят через независимого агента, которого стороны выбирают сами.",
  },
  {
    title: "Конфиденциальность",
    text: "Другие участники видят вас под псевдонимом. Имя раскрывается только с вашего согласия. Документы для проверки вы передаёте напрямую независимому провайдеру или через своего агента; клуб их не хранит.",
  },
  {
    title: "Что дальше",
    text: "Короткая анкета, затем верификация: лично или через ваш банк, семейный офис или представителя. Раскрывать состав активов не требуется. После подтверждения экспертным советом клуб откроется для вас полностью.",
  },
];

export function Onboarding({ name, code }: { name: string; code: string }) {
  const [step, setStep] = useState<0 | 1>(0);

  return (
    <>
      <Steps current={step} />
      <AnimatePresence mode="wait" initial={false}>
        {step === 0 ? (
          <motion.section
            key="about"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <h1 className={s.title}>{name}, вас пригласили в Certa</h1>
            <p className={s.lead}>
              <span className={s.latin}>certa</span>, с латинского: надёжная, достоверная.
            </p>
            <div className={s.about}>
              {ABOUT.map((b) => (
                <div key={b.title} className={s.aboutItem}>
                  <h2 className={s.aboutTitle}>{b.title}</h2>
                  <p className={s.aboutText}>{b.text}</p>
                </div>
              ))}
            </div>
            <button type="button" className={s.submit} onClick={() => { setStep(1); window.scrollTo({ top: 0 }); }}>
              Продолжить
            </button>
          </motion.section>
        ) : (
          <motion.section
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }}
          >
            <h1 className={s.title}>Несколько строк о себе</h1>
            <p className={s.lead}>Эти сведения видит только экспертный совет клуба.</p>
            <RegisterForm code={code} />
            <button type="button" className={s.backBtn} onClick={() => setStep(0)}>
              Назад к описанию клуба
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
