# LibroClaro

LibroClaro es una aplicación web que ofrece libros de texto de la SEP corregidos
y verificados por expertos, presentados en una plataforma web interactiva donde
los errores están subrayados y las correcciones aparecen al pasar el cursor, con
citas a fuentes confiables. Incluye material complementario por materia y grado,
así como un modelo de suscripción freemium.

## Funcionamiento

Los usuarios inician sesión en la plataforma por medio de una dirección de
correo electrónico y una contraseña. Se pueden registrar nuevos usuarios,
proporcionando su nombre completo, su fecha de nacimiento (deben tener 18 años
de edad o más), su correo electrónico y su contraseña (la cual deben confirmar).

Los usuarios tienen acceso a una pantalla de perfil, donde pueden visualizar y
editar sus datos, así como eliminar su cuenta.

La aplicación tiene tres tipos de usuarios:

### Docentes

Los docentes pueden consultar todos los libros del catálogo. Los libros aparecen
en una cuadrícula de portadas en la pantalla principal, divididos por grado
escolar. Los docentes pueden usar la barra de búsqueda para filtrar los libros
por título, por materia, por grado o por ciclo escolar (por ejemplo, 2023-2024).
Al seleccionar el libro, los docentes ven una pantalla con la portada del libro,
el título, la materia, el grado, el ciclo escolar, un párrafo de descripción
sobre el libro, y un botón para abrir el libro.

En la pantalla de lectura del libro, los docentes pueden navegar entre las
distintas páginas del libro. Algunas partes de la página están resaltadas en
color rojo o amarillo. Al pasar el mouse por encima del área resaltada, aparece
un cuadro con información que corrige el área resaltada de la página. El cuadro
desaparece al sacar el mouse del cuadro o del área resaltada. La pantalla de
lectura también incluye un botón para descargar el libro en formato PDF. Además,
al costado del libro se incluye una lista de material complementario
(actividades, videos, obras de texto adicionales, etc.) para reforzar el tema de
la página actual.

### Administradores de institución

Los usuarios que adquieren un plan de suscripción institucional (explicado más
abajo) son asignados como administradores de su institución (escuela,
universidad, sindicato, etc.). Generalmente se trata de uno de los directivos de
la institución. Estos usuarios cuentan como un panel de administración, donde
pueden editar el nombre de la institución, crear usuarios docentes miembros de
la institución, añadir usuarios docentes existentes a la institución, y editar
los datos de los usuarios docentes de la institución. Los docentes que
pertenecen a una institución **no pueden editar sus propios datos en su página
de perfil ni eliminar su propia cuenta**; sólo el administrador de la
institución puede hacerlo.

Los administradores de institución tienen además los mismos beneficios que los
docentes.

### Editores

Los usuarios editores son los empleados de LibroClaro que se encargan de
actualizar el contenido del catálogo de libros. Pueden añadir nuevos libros a la
plataforma, subiendo el documento en formato PDF e ingresando el título, la
materia, el grado, el ciclo escolar y un párrafo de descripción. Por defecto,
los libros se almacenan en el catálogo como _ocultos_, por lo que los docentes
no los verán. Una vez añadido el libro, los editores pueden añadir, editar y
eliminar correcciones y material complementario.

Para añadir una corrección, el editor arrastra el mouse para resaltar el área
rectangular de la página a corregir, especifica si se muestra como _error_
(rojo) o como _error parcial_ (amarillo), y edita el contenido. Para añadir un
ítem de material complementario, el editor pulsa el botón al final de la lista,
especifica de qué página a qué página se muestra, tomando por defecto el número
de página en la que se encuentra actualmente, y edita el contenido.

El contenido de una corrección o de un material complementario es un "stub" de
documento Markdown. El editor escribe el contenido en Markdown puro, incluyendo
los símbolos de formato, y el campo de texto resalta las áreas formateadas para
ayudar a previsualizar el resultado. Por ejemplo, si un editor encierra texto
entre asteriscos dobles (\*\*), el campo muestra el texto en negritas sin
desaparecer los asteriscos.

Los usuarios editores (y sólo los usuarios editores) pueden crear otros usuarios
editores o convertir usuarios docentes no institucionales existentes en usuarios
editores.

## Planes de suscripción

La aplicación ofrece funcionalidad bajo un plan de suscripción. El registro de
métodos de pago se hará de manera simulada, sin integrar un servicio de pago
real.

Existen tres planes:

### Gratuito ($0)

El plan gratuito es el plan aplicado por defecto a los docentes. Ofrece acceso a
todos los libros, pero sólo permite consultar hasta 20 correcciones al mes, y no
ofrece acceso al material complementario. Sólo permite descargar los libros
originales en formato PDF, sin anotaciones integradas.

### Pro ($100/mes)

El plan pro ofrece a los docentes acceso ilimitado a todas las correcciones y al
material complementario.

Además, permite descargar los libros en PDF con las anotaciones integradas. En
las páginas originales, simplemente aparece el área resaltada con un número de
referencia al costado. Todas las anotaciones aparecen en páginas separadas al
final, con el número de referencia correspondiente al costado.

### Institucional ($2500/mes)

El plan institucional crea una nueva institución y asigna al usuario como
administrador de ésta. Ofrece al administrador y a los docentes miembros de la
institución los beneficios del plan Pro.

## Tecnologías

### Front-end

El front-end será desarrollado en React con Vite y TypeScript. Usar librerías
para renderizar los archivos PDF en el navegador.

### Back-end

Se usará una API desarrollada en Express.js con TypeScript, creada en el
subdirectorio _api_. El endpoint para crear libros se enviará como FormData para
enviar los metadatos y el archivo PDF a la vez. Los demás endpoints usarán
formato JSON para las solicitudes y respuestas.

Usar librerías para exportar las portadas de los libros como PNG (optimizando el
envío y la visualización de las portadas), así como para crear los archivos PDF
con anotaciones integradas.

### Bases de datos

Se usarán dos bases de datos, una relacional y una no relacional:

#### BD relacional

Se usará PostgreSQL como base de datos relacional. La BD relacional tendrá al
menos las siguientes tablas:

- Usuarios
- Instituciones
- Libros
- Materias
- Niveles escolares
- Anotaciones
- Facturación

#### BD no relacional

Se usará MongoDB como base de datos no relacional. La BD no relacional tendrá al
menos la siguiente colección:

- Material complementario

### Docker

Se usará Docker para desplegar localmente los servicios de la aplicación. Se
creará un _Dockerfile_ para crear la imagen de la API, y otro para la imagen del
servidor front-end. Se usará un archivo _docker-compose.yaml_ para desplegar el
contenedor del front-end y el de la API junto con los contenedores de Postgres y
MongoDB.

Usar la etiqueta luisfidev/libroclaro:latest para subir la imagen de la API a
Docker Hub, y la etiqueta luisfidev/libroclaro-frontend:latest para la imagen
del front-end.

## Plan de pruebas

El plan de pruebas completo, incluyendo pruebas automatizadas, de rendimiento y
de seguridad, está descrito en el archivo TESTPLAN.md.
