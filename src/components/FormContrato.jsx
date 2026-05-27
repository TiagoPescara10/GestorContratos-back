import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  Grid,
  Flex,
  HStack,
  VStack,
  Checkbox,
  CheckboxGroup,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  useDisclosure,
  Icon
} from "@chakra-ui/react"
import { useMemo, useState, lazy, Suspense } from "react"
import { FiFileText, FiX } from "react-icons/fi"
import { MdAdd, MdClose } from "react-icons/md"
import { createContrato, updateContrato } from "../api/contratos"
import { recalcularMontos } from "../api/contratos"
import LoadingSpinner from "./ui/LoadingSpinner"
import { normalizarConceptosExtras, calcularTotalConceptosExtras } from "../utils/conceptosExtras"

const PdfScanner = lazy(() => import("./PdfScanner"))

const OPCIONES_CONCEPTOS_EXTRAS = ["Luz", "Gas", "Agua", "Cochera", "Expensas", "Cloacas", "Emos", "Municipal"]

let _garanteUid = 0
const nextGaranteUid = () => ++_garanteUid

function FormContrato({ contratoInicial, onSave }) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { isOpen: isPdfOpen, onOpen: onPdfOpen, onClose: onPdfClose } = useDisclosure()

  const estadoInicial = {
    pais: "",
    provincia: "",
    localidad: "",
    codigoPostal: "",
    tipoPropiedad: "",
    direccion: "",
    piso: "",
    departamento: "",

    inquilinoNombre: "",
    inquilinoDni: "",
    inquilinoTelefono: "",

    propietarioNombre: "",
    propietarioDni: "",
    propietarioTelefono: "",
    propietarioCbu: "",
    propietarioNombreCompleto: "",
    propietarioCobraEn: "",
    propietarioCondicionFiscal: "",
    propietarioEmail: "",
    propietarioAlias: "",
    propietarioNecesitaFactura: "no",
    propietarioCuit: "",

    garantes: [
      {
        _uid: nextGaranteUid(),
        nombre: "",
        dni: "",
        telefono: "",
        documentoTipo: "",
        documentos: [],
      }
    ],

    contratoAnexos: [],

    valorMensual: "",
    monedaMensual: "",
    valorDeposito: "",
    monedaDeposito: "",
    fechaInicio: "",
    fechaFin: "",
    frecuenciaAumento: "",
    honorarios: "",
    contratoPdf: null,
    diaPago: "",
    duracion: "",
    tipoAumento: "",
    conceptosExtras: [],
    valorConceptosExtras: "",
    tipoInteresMora: "",
    valorInteresMora: "",
    iva: false,
  }

  const [contrato, setContrato] = useState(() => {
    if (contratoInicial) {
      return {
        ...estadoInicial,
        ...contratoInicial,
        conceptosExtras: normalizarConceptosExtras(contratoInicial.conceptosExtras),
        propietarioNecesitaFactura:
          contratoInicial.propietarioNecesitaFactura === true || contratoInicial.propietarioNecesitaFactura === 'si'
            ? 'si'
            : 'no',
        iva: contratoInicial.incluye_iva,
      }
    }
    return estadoInicial
  })

  const [advertenciasCampos, setAdvertenciasCampos] = useState({})

  const esEdicion = !!contratoInicial

  const conceptosSeleccionados = useMemo(
    () => contrato.conceptosExtras.map((item) => item.nombre),
    [contrato.conceptosExtras]
  )

  const hayConceptosExtras = contrato.conceptosExtras.length > 0
  const totalConceptosExtras = useMemo(
    () => calcularTotalConceptosExtras(contrato.conceptosExtras),
    [contrato.conceptosExtras]
  )

  function handleChange(e) {
    const { name, value } = e.target

    if (name.startsWith('garante_')) {
      const [, index, field] = name.split('_')
      const garanteIndex = parseInt(index)

      setContrato((prevContrato) => ({
        ...prevContrato,
        garantes: prevContrato.garantes.map((garante, i) =>
          i === garanteIndex ? { ...garante, [field]: value } : garante
        )
      }))
      return
    }

    setContrato((prevContrato) => ({
      ...prevContrato,
      [name]: value,
    }))
  }

  const handleAddGarante = () => {
    setContrato((prevContrato) => ({
      ...prevContrato,
      garantes: [...prevContrato.garantes, {
        _uid: nextGaranteUid(),
        nombre: "",
        dni: "",
        telefono: "",
        documentoTipo: "",
        documentos: [],
      }]
    }))
  }

  const handleRemoveGarante = (index) => {
    if (contrato.garantes.length > 1) {
      setContrato((prevContrato) => ({
        ...prevContrato,
        garantes: prevContrato.garantes.filter((_, i) => i !== index)
      }))
    }
  }

  const handleDatosExtraidos = (datos, advertencias) => {
    const mapaAdvertencias = {}
    advertencias?.forEach(adv => {
      mapaAdvertencias[adv.campo] = adv.mensaje
    })
    setAdvertenciasCampos(mapaAdvertencias)
    setContrato(prev => ({
      ...prev,
      ...datos,
      conceptosExtras: normalizarConceptosExtras(datos.conceptosExtras),
      garantes: datos.garantes?.length > 0
        ? datos.garantes.map(g => ({ ...g, _uid: nextGaranteUid(), documentos: [] }))
        : prev.garantes,
      iva: datos.iva || false,
      propietarioNecesitaFactura: datos.propietarioNecesitaFactura || "no",
    }))
  }

  const handleGaranteArchivos = (index, files) => {
    const nuevos = Array.from(files).slice(0, 10)
    setContrato(prev => ({
      ...prev,
      garantes: prev.garantes.map((g, i) =>
        i === index
          ? { ...g, documentos: [...(g.documentos || []), ...nuevos].slice(0, 10) }
          : g
      )
    }))
  }

  const eliminarDocumentoGarante = (garanteIndex, docIndex) => {
    setContrato(prev => ({
      ...prev,
      garantes: prev.garantes.map((g, i) =>
        i === garanteIndex
          ? { ...g, documentos: g.documentos.filter((_, j) => j !== docIndex) }
          : g
      )
    }))
  }


  function handleCheckbox(e) {
    const { value, checked } = e.target

    if (checked) {
      onOpen()

      setContrato((prevContrato) => {
        const yaExiste = prevContrato.conceptosExtras.some((item) => item.nombre === value)
        if (yaExiste) {
          return prevContrato
        }

        return {
          ...prevContrato,
          conceptosExtras: [...prevContrato.conceptosExtras, { nombre: value, precio: "" }],
        }
      })
    } else {
      setContrato((prevContrato) => {
        const conceptosExtras = prevContrato.conceptosExtras.filter((item) => item.nombre !== value)

        if (conceptosExtras.length === 0) {
          onClose()
        }

        return {
          ...prevContrato,
          conceptosExtras,
        }
      })
    }
  }

  function handleConceptoExtraPrecioChange(nombre, value) {
    if (value !== "" && Number.isNaN(Number(value))) {
      return
    }

    setContrato((prevContrato) => ({
      ...prevContrato,
      conceptosExtras: prevContrato.conceptosExtras.map((item) =>
        item.nombre === nombre
          ? { ...item, precio: value === "" ? "" : Number(value) }
          : item
      ),
    }))
  }

  const hayErroresEnConceptosExtras = contrato.conceptosExtras.some(
    (item) => item.precio === "" || Number.isNaN(Number(item.precio))
  )

  const handleContratoAnexos = (files) => {
    setContrato(prev => ({
      ...prev,
      contratoAnexos: [...prev.contratoAnexos, ...Array.from(files)]
    }))
  }

  const handleFile = (e) => {
    setContrato((prevContrato) => ({
      ...prevContrato,
      contratoPdf: e.target.files[0]
    }))
  }



  const handleSave = async () => {
    const propietarioCompleto = contrato.propietarioNombreCompleto?.trim() || contrato.propietarioNombre?.trim()

    if (!propietarioCompleto) {
      alert("Por favor completa Propietario Nombre Completo o el Nombre del propietario antes de guardar.")
      return
    }

    const necesitaFactura = contrato.propietarioNecesitaFactura === 'si'
    if (necesitaFactura && (!contrato.propietarioCuit || !contrato.propietarioCondicionFiscal)) {
      alert("Si indicás que el propietario necesita factura, son obligatorios CUIT y Condición Fiscal.")
      return
    }

    if (hayErroresEnConceptosExtras) {
      alert("Completá un precio numérico para cada concepto extra seleccionado.")
      onOpen()
      return
    }

    try {


      const formData = new FormData()

      const camposTexto = {
        pais: contrato.pais,
        provincia: contrato.provincia,
        localidad: contrato.localidad,
        codigoPostal: contrato.codigoPostal,
        tipoPropiedad: contrato.tipoPropiedad,
        direccion: contrato.direccion,
        piso: contrato.piso || "",
        departamento: contrato.departamento || "",
        inquilinoNombre: contrato.inquilinoNombre,
        inquilinoDni: contrato.inquilinoDni,
        inquilinoTelefono: contrato.inquilinoTelefono,
        propietarioNombre: contrato.propietarioNombre,
        propietarioDni: contrato.propietarioDni,
        propietarioTelefono: contrato.propietarioTelefono,
        propietarioCbu: contrato.propietarioCbu,
        propietarioNombreCompleto: propietarioCompleto,
        propietarioCobraEn: contrato.propietarioCobraEn,
        propietarioCondicionFiscal: contrato.propietarioCondicionFiscal,
        propietarioEmail: contrato.propietarioEmail,
        propietarioAlias: contrato.propietarioAlias,
        propietarioCuit: contrato.propietarioCuit,
        propietarioNecesitaFactura: contrato.propietarioNecesitaFactura === 'si' ? 'true' : 'false',
        garantes: JSON.stringify(contrato.garantes.map(g => ({
          nombre: g.nombre,
          dni: g.dni,
          telefono: g.telefono,
          documentoTipo: g.documentoTipo,
          documentos: (g.documentos || []).filter(d => !(d instanceof File)),
        }))),
        valorMensual: contrato.valorMensual,
        monedaMensual: contrato.monedaMensual,
        valorDeposito: contrato.valorDeposito,
        monedaDeposito: contrato.monedaDeposito,
        fechaInicio: contrato.fechaInicio,
        fechaFin: contrato.fechaFin,
        frecuenciaAumento: contrato.frecuenciaAumento,
        honorarios: contrato.honorarios,
        diaPago: contrato.diaPago,
        duracion: contrato.duracion,
        tipoAumento: contrato.tipoAumento,
        tipoInteresMora: contrato.tipoInteresMora,
        valorInteresMora: contrato.valorInteresMora,
        incluye_iva: contrato.iva ? 'true' : 'false',
        valorConceptosExtras: totalConceptosExtras,
        conceptosExtras: JSON.stringify(
          contrato.conceptosExtras.map((item) => ({
            nombre: item.nombre,
            precio: Number(item.precio),
          }))
        ),
      }

      for (const [key, value] of Object.entries(camposTexto)) {
        if (value !== null && value !== undefined) {
          formData.append(key, value)
        }
      }

      if (contrato.contratoPdf instanceof File) {
        formData.append('contratoPdf', contrato.contratoPdf)
      }

      contrato.garantes.forEach((garante, i) => {
        const docs = garante.documentos || []
        docs.forEach((doc, j) => {
          if (doc instanceof File) {
            formData.append(`garanteDocumento_${i}_${j}`, doc)
          }
        })
      })

      contrato.contratoAnexos.forEach((anexo, j) => {
        if (anexo instanceof File) formData.append(`contratoAnexo_${j}`, anexo)
      })


      if (esEdicion) {
        await updateContrato(contrato.id, formData)
        await recalcularMontos(contrato.id)
      } else {
        await createContrato(formData)
      }

      window.dispatchEvent(new Event("contractsUpdated"));
      alert(esEdicion ? "Contrato actualizado ✅" : "Contrato guardado ✅")

      if (onSave) onSave()

      if (!esEdicion) {
        setContrato(estadoInicial)
        onClose()
      }
    } catch (error) {
      console.error(error)
      const message = error?.data ? JSON.stringify(error.data) : error.message
      alert(`Error al guardar el contrato: ${message}`)
    }
  }

  return (
    <Box p={8} bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch">

        <HStack justify="flex-end" mb={4}>
          <Button
            leftIcon={<Icon as={FiFileText} />}
            colorScheme="purple"
            variant="outline"
            onClick={onPdfOpen}
          >
            Cargar desde PDF
          </Button>
        </HStack>

        <Suspense fallback={<LoadingSpinner />}>
          <PdfScanner
            isOpen={isPdfOpen}
            onClose={onPdfClose}
            onDatosExtraidos={handleDatosExtraidos}
          />
        </Suspense>

        <Heading>
          {esEdicion ? "Editar Contrato" : "Nuevo Contrato"}
        </Heading>

        {/* 🔵 PROPIEDAD */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Heading size="md" mb={6}>Información de la Propiedad</Heading>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
            <FormControl>
              <FormLabel>País</FormLabel>
              <Input name="pais" value={contrato.pais} onChange={handleChange} />
              {advertenciasCampos.pais && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.pais}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Provincia</FormLabel>
              <Input name="provincia" value={contrato.provincia} onChange={handleChange} />
              {advertenciasCampos.provincia && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.provincia}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Localidad</FormLabel>
              <Input name="localidad" value={contrato.localidad} onChange={handleChange} />
              {advertenciasCampos.localidad && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.localidad}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Direccion</FormLabel>
              <Input name="direccion" value={contrato.direccion} onChange={handleChange} />
              {advertenciasCampos.direccion && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.direccion}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Piso</FormLabel>
              <Input
                name="piso"
                value={contrato.piso || ""}
                onChange={handleChange}
                placeholder="Ej: 4, PB, etc"
              />
              {advertenciasCampos.piso && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.piso}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Departamento</FormLabel>
              <Input
                name="departamento"
                value={contrato.departamento || ""}
                onChange={handleChange}
                placeholder="Ej: A, B, C, etc"
              />
              {advertenciasCampos.departamento && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.departamento}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Código Postal</FormLabel>
              <Input name="codigoPostal" value={contrato.codigoPostal} onChange={handleChange} />
              {advertenciasCampos.codigoPostal && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.codigoPostal}</Text>
              )}
            </FormControl>

            <FormControl gridColumn="span 2">
              <FormLabel>Tipo de Propiedad</FormLabel>
              <Select name="tipoPropiedad" value={contrato.tipoPropiedad} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="local">Local</option>
                <option value="oficina">Oficina</option>
                <option value="departamento">Departamento</option>
                <option value="casa">Casa</option>
                <option value="galpon">Galpon</option>
                <option value="cochera">Cochera</option>
              </Select>
              {advertenciasCampos.tipoPropiedad && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.tipoPropiedad}</Text>
              )}
            </FormControl>
          </Grid>
        </Box>

        {/* 🟢 INQUILINO */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Heading size="md" mb={4}>Inquilino</Heading>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
            <FormControl>
              <FormLabel>Nombre</FormLabel>
              <Input name="inquilinoNombre" value={contrato.inquilinoNombre} onChange={handleChange} />
              {advertenciasCampos.inquilinoNombre && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.inquilinoNombre}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>DNI</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>Sin puntos, solo números. Ej: 12345678</Text>
              <Input name="inquilinoDni" value={contrato.inquilinoDni} onChange={handleChange} />
              {advertenciasCampos.inquilinoDni && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.inquilinoDni}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Teléfono</FormLabel>
              <Input name="inquilinoTelefono" value={contrato.inquilinoTelefono} onChange={handleChange} />
              {advertenciasCampos.inquilinoTelefono && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.inquilinoTelefono}</Text>
              )}
            </FormControl>
          </Grid>
        </Box>

        {/* 🔵 PROPIETARIO */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Heading size="md" mb={4}>Propietario</Heading>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>

            <FormControl>
              <FormLabel>Nombre</FormLabel>
              <Input name="propietarioNombre" value={contrato.propietarioNombre} onChange={handleChange} />
              {advertenciasCampos.propietarioNombre && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioNombre}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>DNI</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>Sin puntos, solo números. Ej: 12345678</Text>
              <Input name="propietarioDni" value={contrato.propietarioDni} onChange={handleChange} />
              {advertenciasCampos.propietarioDni && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioDni}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Teléfono</FormLabel>
              <Input name="propietarioTelefono" value={contrato.propietarioTelefono} onChange={handleChange} />
              {advertenciasCampos.propietarioTelefono && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioTelefono}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input type="email" name="propietarioEmail" value={contrato.propietarioEmail} onChange={handleChange} />
              {advertenciasCampos.propietarioEmail && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioEmail}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>CBU</FormLabel>
              <Input name="propietarioCbu" value={contrato.propietarioCbu} onChange={handleChange} />
              {advertenciasCampos.propietarioCbu && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioCbu}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Alias</FormLabel>
              <Input name="propietarioAlias" value={contrato.propietarioAlias} onChange={handleChange} />
              {advertenciasCampos.propietarioAlias && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioAlias}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Cobra en</FormLabel>
              <Select name="propietarioCobraEn" value={contrato.propietarioCobraEn} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
              </Select>
              {advertenciasCampos.propietarioCobraEn && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioCobraEn}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Condición Fiscal</FormLabel>
              <Select name="propietarioCondicionFiscal" value={contrato.propietarioCondicionFiscal} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributo">Monotributista</option>
                <option value="consumidor_final">Consumidor Final</option>
              </Select>
              {advertenciasCampos.propietarioCondicionFiscal && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioCondicionFiscal}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>CUIT</FormLabel>
              <Input name="propietarioCuit" value={contrato.propietarioCuit} onChange={handleChange} />
              {advertenciasCampos.propietarioCuit && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioCuit}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>¿Necesita Factura?</FormLabel>
              <Select name="propietarioNecesitaFactura" value={contrato.propietarioNecesitaFactura} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
              {advertenciasCampos.propietarioNecesitaFactura && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.propietarioNecesitaFactura}</Text>
              )}
            </FormControl>

          </Grid>
        </Box>

        {/*  GARANTES */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Flex justify="space-between" align="center" mb={6}>
            <Heading size="md">Garantes</Heading>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              onClick={handleAddGarante}
              colorScheme="blue"
              size="sm"
            >
              Añadir Garante
            </Button>
          </Flex>

          <VStack spacing={6} align="stretch">
            {contrato.garantes.map((garante, index) => (
              <Box key={garante._uid ?? index} borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="semibold" color="gray.700">
                    Garante {index + 1}
                  </Text>
                  {contrato.garantes.length > 1 && (
                    <Button
                      leftIcon={<Icon as={MdClose} />}
                      onClick={() => handleRemoveGarante(index)}
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                    >
                      Eliminar
                    </Button>
                  )}
                </Flex>

                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                  <FormControl>
                    <FormLabel>Nombre</FormLabel>
                    <Input
                      name={`garante_${index}_nombre`}
                      value={garante.nombre}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Teléfono</FormLabel>
                    <Input
                      name={`garante_${index}_telefono`}
                      value={garante.telefono}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>DNI</FormLabel>
                    <Text fontSize="xs" color="gray.500" mb={1}>Sin puntos, solo números. Ej: 12345678</Text>
                    <Input
                      name={`garante_${index}_dni`}
                      value={garante.dni}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Documento del garante</FormLabel>
                    <Select
                      name={`garante_${index}_documentoTipo`}
                      value={garante.documentoTipo}
                      onChange={handleChange}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="recibo_sueldo">Recibo de sueldo</option>
                      <option value="titulo_propiedad">Título de propiedad</option>
                      <option value="otro">Otro</option>
                    </Select>
                  </FormControl>

                  <FormControl gridColumn="span 2">
                    <FormLabel>Documentos del garante (máx. 10)</FormLabel>

                    <Input
                      type="file"
                      accept="application/pdf,image/*"
                      multiple
                      display="none"
                      id={`garante-file-upload-${index}`}
                      onChange={(e) => handleGaranteArchivos(index, e.target.files)}
                    />

                    <label htmlFor={`garante-file-upload-${index}`}>
                      <Button as="span" bg="black" color="white" size="sm">
                        Agregar archivos
                      </Button>
                    </label>

                    {(garante.documentos || []).map((doc, j) => (
                      <HStack key={j} mt={1}>
                        <Text fontSize="sm" isTruncated maxW="200px">
                          {doc instanceof File ? doc.name : doc}
                        </Text>
                        <IconButton
                          size="xs"
                          icon={<FiX />}
                          aria-label="Eliminar"
                          onClick={() => eliminarDocumentoGarante(index, j)}
                        />
                      </HStack>
                    ))}
                  </FormControl>
                </Grid>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* 🔵 CONTRATO */}
        <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
          <Heading size="md" mb={6}>Información del Contrato</Heading>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>

            <FormControl>
              <FormLabel>Valor Mensual</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>Sin puntos ni comas. Ej: 150000</Text>
              <Input type="number" name="valorMensual" value={contrato.valorMensual} onChange={handleChange} />
              {advertenciasCampos.valorMensual && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.valorMensual}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Moneda</FormLabel>
              <Select name="monedaMensual" value={contrato.monedaMensual} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </Select>
              {advertenciasCampos.monedaMensual && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.monedaMensual}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Valor Depósito</FormLabel>
              <Input type="number" name="valorDeposito" value={contrato.valorDeposito} onChange={handleChange} />
              {advertenciasCampos.valorDeposito && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.valorDeposito}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Moneda Depósito</FormLabel>
              <Select name="monedaDeposito" value={contrato.monedaDeposito} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </Select>
              {advertenciasCampos.monedaDeposito && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.monedaDeposito}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Fecha Inicio</FormLabel>
              <Input type="date" name="fechaInicio" value={contrato.fechaInicio} onChange={handleChange} />
              {advertenciasCampos.fechaInicio && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.fechaInicio}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Fecha Fin</FormLabel>
              <Input type="date" name="fechaFin" value={contrato.fechaFin} onChange={handleChange} />
              {advertenciasCampos.fechaFin && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.fechaFin}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Frecuencia de Aumento</FormLabel>
              <Select name="frecuenciaAumento" value={contrato.frecuenciaAumento} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="cuatrimestral">Cuatrimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </Select>
              {advertenciasCampos.frecuenciaAumento && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.frecuenciaAumento}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Tipo de Aumento</FormLabel>
              <Select name="tipoAumento" value={contrato.tipoAumento} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="ICL">ICL</option>
                <option value="IPC">IPC</option>
                <option value="casa_propia">Índice Casa Propia</option>
                <option value="fijo">Porcentaje Fijo</option>
              </Select>
              {advertenciasCampos.tipoAumento && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.tipoAumento}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Honorarios</FormLabel>
              <Input type="number" name="honorarios" value={contrato.honorarios} onChange={handleChange} />
              {advertenciasCampos.honorarios && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.honorarios}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Día de Pago</FormLabel>
              <Input type="number" name="diaPago" value={contrato.diaPago} onChange={handleChange} />
              {advertenciasCampos.diaPago && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.diaPago}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Tipo Interés Mora</FormLabel>
              <Select name="tipoInteresMora" value={contrato.tipoInteresMora} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="porcentaje">% por día</option>
                <option value="fijo">Monto fijo por día</option>
              </Select>
              {advertenciasCampos.tipoInteresMora && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.tipoInteresMora}</Text>
              )}
            </FormControl>

            <FormControl >
              <FormLabel>Valor Interés</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>Usar punto decimal, sin el signo %. Ej: 1.5</Text>
              <Input type="number" name="valorInteresMora" value={contrato.valorInteresMora} onChange={handleChange} />
              {advertenciasCampos.valorInteresMora && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.valorInteresMora}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Conceptos Extras</FormLabel>
              <CheckboxGroup>
                <Flex gap={6} wrap="wrap">
                  {OPCIONES_CONCEPTOS_EXTRAS.map(item => (
                    <Checkbox
                      key={item}
                      value={item}
                      isChecked={conceptosSeleccionados.includes(item)}
                      onChange={handleCheckbox}
                    >
                      {item}
                    </Checkbox>
                  ))}
                </Flex>
              </CheckboxGroup>
              {hayConceptosExtras && (
                <Box mt={3}>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Configurá los importes de cada concepto en el modal.
                  </Text>
                  <Button size="sm" variant="outline" onClick={onOpen}>
                    Editar conceptos extras
                  </Button>
                </Box>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Duración</FormLabel>
              <Input type="number" name="duracion" value={contrato.duracion} onChange={handleChange} />
              {advertenciasCampos.duracion && (
                <Text fontSize="xs" color="orange.500" mt={1}>⚠ {advertenciasCampos.duracion}</Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Contrato PDF</FormLabel>

              <Input
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                display="none"
                id="file-upload"
                onChange={handleFile}
              />

              <label htmlFor="file-upload">
                <Button as="span" bg="black" color="white">
                  Seleccionar archivo
                </Button>
              </label>

              {contrato.contratoPdf && (
                <Box mt={2} fontSize="sm">
                  {contrato.contratoPdf.name || contrato.contratoPdf}
                </Box>
              )}
            </FormControl>

            <FormControl>
              <Text>No anda por ahora.</Text>
              <FormLabel>Anexos (PDF)</FormLabel>

              <Input
                type="file"
                accept="application/pdf"
                multiple
                display="none"
                id="contrato-anexos-upload"
                onChange={(e) => handleContratoAnexos(e.target.files)}
              />

              <label htmlFor="contrato-anexos-upload">
                <Button as="span" bg="black" color="white" size="sm">
                  Agregar anexos
                </Button>
              </label>

              {contrato.contratoAnexos.map((anexo, j) => (
                <HStack key={j} mt={1}>
                  <Text fontSize="sm" isTruncated maxW="200px">
                    {anexo instanceof File ? anexo.name : anexo}
                  </Text>
                  <IconButton
                    size="xs"
                    icon={<FiX />}
                    aria-label="Eliminar"
                    onClick={() => setContrato(prev => ({ ...prev, contratoAnexos: prev.contratoAnexos.filter((_, i) => i !== j) }))}
                  />
                </HStack>
              ))}
            </FormControl>

          <FormControl display="flex" alignItems="center">
            <Checkbox
              isChecked={contrato.iva}
              onChange={(e) =>
                setContrato({
                  ...contrato,
                  iva: e.target.checked,
                })
              }
            >
              Aplica IVA
            </Checkbox>
          </FormControl>

          </Grid>

          <Flex justify="center" mt={8}>
            <Button
              leftIcon={<FiFileText />}
              bg="black"
              color="white"
              px={12}
              py={6}
              borderRadius="xl"
              _hover={{ bg: "gray.800" }}
              onClick={handleSave}
            >
              {esEdicion ? "Actualizar Contrato" : "Guardar Contrato"}
            </Button>
          </Flex>
        </Box>

      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Conceptos extras</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {contrato.conceptosExtras.map((item) => {
                const tieneError = item.precio === "" || Number.isNaN(Number(item.precio))

                return (
                  <FormControl key={item.nombre} isInvalid={tieneError}>
                    <FormLabel>{item.nombre}</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={`Precio para ${item.nombre}`}
                      value={item.precio}
                      onChange={(e) => handleConceptoExtraPrecioChange(item.nombre, e.target.value)}
                    />
                    <FormErrorMessage>
                      Ingresá un número válido para este concepto.
                    </FormErrorMessage>
                  </FormControl>
                )
              })}

              {!hayConceptosExtras && (
                <Text fontSize="sm" color="gray.500">
                  No hay conceptos extras seleccionados.
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cerrar
            </Button>
            <Button bg="black" color="white" _hover={{ bg: "gray.800" }} onClick={onClose}>
              Guardar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default FormContrato
