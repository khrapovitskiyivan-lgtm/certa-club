import s from "../invite/invite.module.css";

export default function Welcome() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Верификация на рассмотрении</h1>
        <p className={s.lead}>
          Спасибо. Куратор клуба свяжется с вами лично или с вашим агентом, если вы выбрали этот способ. После
          подтверждения экспертным советом клуб откроется для вас полностью.
        </p>
        <p className={s.hint}>
          Как входить в клуб: на главной странице нажмите «Вход по приглашению», введите почту и пароль. В обычном
          браузере клуб предложит включить вход по Face ID.
        </p>
      </div>
    </main>
  );
}
