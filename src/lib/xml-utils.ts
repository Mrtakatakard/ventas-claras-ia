import { Invoice } from "./types";

export const generateInvoiceXML = (invoice: Invoice): string => {
    // Basic mapping to a standard e-CF structure (simplified for example purposes)
    // Real DGII e-CF has a complex structure (ECF, Encabezado, Detalle, etc.)

    const formatDate = (date: string) => date; // Assuming ISO YYYY-MM-DD

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
    <Encabezado>
        <IdDoc>
            <TipoeCF>${invoice.ncfType || '00'}</TipoeCF>
            <eNCF>${invoice.ncf || ''}</eNCF>
            <FechaVencimientoSecuencia>${invoice.dueDate}</FechaVencimientoSecuencia>
            <IndicadorMontoGravado>0</IndicadorMontoGravado>
            <TipoIngresos>01</TipoIngresos>
            <TipoPago>${invoice.payments?.[0]?.method || '1'}</TipoPago>
            <FechaVencimiento>${invoice.dueDate}</FechaVencimiento>
        </IdDoc>
        <Emisor>
            <RNCEmisor>000000000</RNCEmisor>
            <RazonSocialEmisor>Ventas Claras User</RazonSocialEmisor>
            <FechaEmision>${formatDate(invoice.issueDate)}</FechaEmision>
        </Emisor>
        <Comprador>
            <RNCComprador>000000000</RNCComprador>
            <RazonSocialComprador>${invoice.clientName}</RazonSocialComprador>
        </Comprador>
        <Totales>
            <MontoTotal>${invoice.total.toFixed(2)}</MontoTotal>
            <MontoGravadoTotal>${(invoice.total - invoice.itbis).toFixed(2)}</MontoGravadoTotal>
            <MontoImpuestoAdicional>${invoice.itbis.toFixed(2)}</MontoImpuestoAdicional>
            <MontoTotalDescuentos>${(invoice.discountTotal || 0).toFixed(2)}</MontoTotalDescuentos>
        </Totales>
    </Encabezado>
    <Detalles>
        ${invoice.items.map((item, index) => `
        <Item>
            <NumeroLinea>${index + 1}</NumeroLinea>
            <CodigoItem>${item.productId}</CodigoItem>
            <NombreItem>${item.productName}</NombreItem>
            <CantidadItem>${item.quantity}</CantidadItem>
            <PrecioUnitarioItem>${item.unitPrice.toFixed(2)}</PrecioUnitarioItem>
            <DescuentoMonto>${((item.discount || 0) * item.unitPrice / 100).toFixed(2)}</DescuentoMonto>
            <MontoItem>${((item.finalPrice || item.unitPrice) * item.quantity).toFixed(2)}</MontoItem>
        </Item>`).join('')}
    </Detalles>
</ECF>`;

    return xml;
};

export const downloadXML = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
};
