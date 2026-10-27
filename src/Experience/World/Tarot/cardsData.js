// Las 22 cartas de la baraja. Nombre y significado corto de cada una están en
// los locales (cards.<id>.name / cards.<id>.meaning); las imágenes (WebP 768 px) en public/cards/.
//
// description: lo que la calabaza sabe de cada carta para leer la tirada. Solo lo usa el
// servidor (api/oracle.js), que lo traduce al idioma del jugador al leer. Aquí no hay cartas
// malas: cada una es luminosa o, como mucho, un enigma con salida.
const IMG = '/cards/'

export const BACK_IMAGE = IMG + 'reverse-card.webp'

// Posiciones de la lectura, en el orden de los huecos de la mesa
export const POSITIONS = ['past', 'present', 'future']

export const CARDS = [
  {
    id: 'fool',
    numeral: '0',
    image: IMG + 'el-loco.webp',
    description:
      'El viajero que salta al vacío con una sonrisa. Anuncia un comienzo inesperado: algo nuevo te llama, y la suerte favorece a quien se atreve sin tenerlo todo planeado.',
  },
  {
    id: 'magician',
    numeral: 'I',
    image: IMG + 'el-mago.webp',
    description:
      'Quien tiene sobre la mesa todo lo que necesita. Habla de un talento que despierta: lo que deseas puede tomar forma si unes intención y acción.',
  },
  {
    id: 'highPriestess',
    numeral: 'II',
    image: IMG + 'la-sacerdotisa.webp',
    description:
      'Guardiana del velo entre lo visible y lo oculto. Susurra que ya conoces la respuesta: tu intuición ve más lejos que tus ojos, y un secreto se revelará a su debido tiempo.',
  },
  {
    id: 'empress',
    numeral: 'III',
    image: IMG + 'la-emperatriz.webp',
    description:
      'Reina de los huertos bajo la luna llena. Promete una abundancia que crece despacio: proyectos, vínculos o ideas que, bien cuidados, darán más fruto del esperado.',
  },
  {
    id: 'emperor',
    numeral: 'IV',
    image: IMG + 'el-emperador.webp',
    description:
      'Señor del trono de piedra que pone orden en el caos. Es momento de construir bases firmes: la disciplina de hoy será el castillo que te proteja mañana.',
  },
  {
    id: 'hierophant',
    numeral: 'V',
    image: IMG + 'el-hierofante.webp',
    description:
      'Maestro de antiguos rituales y llaves. Señala a un guía, un aprendizaje o una tradición que te abrirá una puerta; escuchar a quien ya recorrió el camino te ahorrará pasos.',
  },
  {
    id: 'lovers',
    numeral: 'VI',
    image: IMG + 'los-enamorados.webp',
    description:
      'Dos almas frente a un cruce de caminos iluminado por luciérnagas. Habla de un vínculo especial y de una elección importante: el corazón ya sabe hacia dónde inclinarse.',
  },
  {
    id: 'chariot',
    numeral: 'VII',
    image: IMG + 'el-carro.webp',
    description:
      'Un carro tirado por dos fuerzas que quieren ir a lados distintos. Victoria para quien sostiene las riendas: si alineas lo que piensas y lo que sientes, nada te detendrá.',
  },
  {
    id: 'strength',
    numeral: 'VIII',
    image: IMG + 'la-fuerza.webp',
    description:
      'La calma que doma a un león sin levantar la voz. No es fuerza bruta sino coraje sereno: lo que parecía indomable se rendirá ante tu paciencia.',
  },
  {
    id: 'hermit',
    numeral: 'IX',
    image: IMG + 'el-ermitano.webp',
    description:
      'Un farol encendido en la cima de la montaña. Invita a una pausa para escucharte: en el silencio encontrarás la respuesta que el ruido no te dejaba oír.',
  },
  {
    id: 'wheelOfFortune',
    numeral: 'X',
    image: IMG + 'la-rueda-de-la-fortuna.webp',
    description:
      'La gran rueda que gira entre las estrellas y nunca se detiene. Anuncia un giro del destino: lo que estaba quieto se pone en marcha y las oportunidades llegan por sorpresa.',
  },
  {
    id: 'justice',
    numeral: 'XI',
    image: IMG + 'la-juzticia.webp',
    description:
      'Balanza en una mano y espada en la otra. Lo que sembraste vuelve a ti: es tiempo de decisiones claras, de equilibrar cuentas y de ver las cosas tal como son.',
  },
  {
    id: 'hangedMan',
    numeral: 'XII',
    image: IMG + 'el-colgado.webp',
    description:
      'Quien cuelga cabeza abajo con un halo dorado y una sonrisa tranquila. Lo que parece una pausa es una nueva perspectiva: mirar el mundo al revés te mostrará lo que nadie más ve.',
  },
  {
    id: 'death',
    numeral: 'XIII',
    image: IMG + 'la-muerte.webp',
    description:
      'La guadaña que corta lo viejo para que brote lo nuevo. No es un final temible sino una transformación: una etapa se cierra y deja espacio para una versión renovada de ti.',
  },
  {
    id: 'temperance',
    numeral: 'XIV',
    image: IMG + 'la-templanza.webp',
    description:
      'El agua que pasa de una copa a otra sin derramar una gota. Habla de equilibrio y de sanar: las cosas se acomodan si das tiempo al tiempo y mezclas lo justo.',
  },
  {
    id: 'devil',
    numeral: 'XV',
    image: IMG + 'el-diablo.webp',
    description:
      'Cadenas que parecen fuertes pero cuelgan flojas. Señala un deseo o un hábito que te tiene atrapado; reconocerlo basta para soltarlo y convertir esa fuerza en pasión bien dirigida.',
  },
  {
    id: 'tower',
    numeral: 'XVI',
    image: IMG + 'la-torre.webp',
    description:
      'El rayo que sacude la torre y derriba lo que estaba mal construido. Un cambio repentino despeja el camino: lo que cae deja ver el cielo y una verdad que te libera.',
  },
  {
    id: 'star',
    numeral: 'XVII',
    image: IMG + 'estrella.webp',
    description:
      'Una estrella que brilla sobre aguas tranquilas después de la tormenta. Esperanza, inspiración y sanación: un deseo pedido con fe empieza a encontrar su camino hacia ti.',
  },
  {
    id: 'moon',
    numeral: 'XVIII',
    image: IMG + 'luna.webp',
    description:
      'La luna que ilumina un sendero entre la niebla. Sueños, misterio e imaginación: no todo es lo que parece, y tu intuición será la mejor brújula para cruzar la bruma.',
  },
  {
    id: 'sun',
    numeral: 'XIX',
    image: IMG + 'sol.webp',
    description:
      'Un sol radiante sobre un campo de girasoles. Alegría, éxito y claridad: lo que estaba en sombra se ilumina y empieza una etapa luminosa.',
  },
  {
    id: 'experienceApprentice',
    numeral: '∞',
    image: IMG + 'aprendiz-de-experiencias.webp',
    description:
      'Carta única de esta baraja: el aprendiz que convierte cada experiencia en una lección. Anuncia una etapa de descubrimiento en la que cada tropiezo será un maestro y cada intento, un paso adelante.',
  },
  {
    id: 'experienceCreator',
    numeral: '∞',
    image: IMG + 'creador-de-experiencias.webp',
    description:
      'Carta única de esta baraja: el creador que da vida a lo que imagina. Tus ideas tienen poder: algo que construyas con tus propias manos sorprenderá a quienes lo vivan.',
  },
]
