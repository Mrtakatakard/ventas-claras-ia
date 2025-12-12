import { Invoice, UserProfile, Client, InvoiceItem } from "./types";

export const generateInvoiceXML = (invoice: Invoice, issuer: UserProfile, client: Client): string => {
    // Helper to format date as DD-MM-YYYY
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // Helper to format date + time
    const formatDateTime = (date: Date) => {
        const d = formatDate(date.toISOString());
        const time = date.toTimeString().split(' ')[0]; // HH:MM:SS
        return `${d} ${time}`;
    };

    // Remove non-numeric characters from RNC/Phone
    const cleanStr = (str?: string) => str?.replace(/[^a-zA-Z0-9]/g, '') || '';

    // Calculate totals
    let montoGravadoTotal = 0;
    let montoExentoTotal = 0;

    invoice.items.forEach(item => {
        const itemTotal = item.unitPrice * item.quantity;
        const discount = itemTotal * ((item.discount || 0) / 100);
        const netTotal = itemTotal - discount;

        // Check tax status
        // '3' = Exempt, '1' = 18% (Taxable), others treat as taxable for now or add logic
        // If product was exempt (legacy boolean), map to Exempt
        const isExempt = item.isTaxExempt || item.taxType === '3';

        if (isExempt) {
            montoExentoTotal += netTotal;
        } else {
            montoGravadoTotal += netTotal;
        }
    });

    // Prepare eNCF (remove 'e-' prefix label if present, just keep 'E31...')
    const eNCF = invoice.ncf?.replace(/^e-NCF:\s*/i, '') || '';

    // NCF Type: remove 'E' if it's in the type code (optional, user XML has '31' in TipoECF but 'E31' in eNCF)
    const tipoECF = invoice.ncfType?.replace(/^E/i, '') || '31'; // Default 31 if missing

    const xml = `<ECF>
    <Encabezado>
        <Version>1.0</Version>
        <IdDoc>
            <TipoeCF>${tipoECF}</TipoeCF>
            <eNCF>${eNCF}</eNCF>
            <FechaVencimientoSecuencia>${formatDate(invoice.dueDate)}</FechaVencimientoSecuencia>
            <IndicadorMontoGravado>0</IndicadorMontoGravado>
            <TipoIngresos>01</TipoIngresos>
            <TipoPago>${invoice.payments?.[0]?.method === 'efectivo' ? '1' : '2'}</TipoPago> 
            <TerminoPago>${invoice.status === 'pagada' ? 'Contado' : 'Crédito'}</TerminoPago>
        </IdDoc>
        <Emisor>
            <RNCEmisor>${cleanStr(issuer.rnc)}</RNCEmisor>
            <RazonSocialEmisor>${issuer.companyName || issuer.name}</RazonSocialEmisor>
            <CorreoEmisor>${issuer.email}</CorreoEmisor>
            <FechaEmision>${formatDate(invoice.issueDate)}</FechaEmision>
        </Emisor>
        <Comprador>
            <RNCComprador>${cleanStr(client.rnc || '000000000')}</RNCComprador>
            <RazonSocialComprador>${client.name}</RazonSocialComprador>
            <CorreoComprador>${client.email}</CorreoComprador>
            <DireccionComprador>${client.addresses?.[0]?.fullAddress || ''}</DireccionComprador>
            <TelefonoAdicional>${cleanStr(client.phone)}</TelefonoAdicional>
            ${/* Optional: Add Municipio/Provincia if we had them structure in Address */ ''}
        </Comprador>
        <Totales>
            <MontoExento>${montoExentoTotal.toFixed(2)}</MontoExento>
            <MontoGravadoTotal>${montoGravadoTotal.toFixed(2)}</MontoGravadoTotal>
            <MontoImpuestoAdicional>${invoice.itbis.toFixed(2)}</MontoImpuestoAdicional>
            <MontoTotalDescuentos>${(invoice.discountTotal || 0).toFixed(2)}</MontoTotalDescuentos>
            <MontoTotal>${invoice.total.toFixed(2)}</MontoTotal>
        </Totales>
    </Encabezado>
    <DetallesItems>
        ${invoice.items.map((item, index) => {
        const itemTotal = item.unitPrice * item.quantity;
        const discountAmount = itemTotal * ((item.discount || 0) / 100);

        // Default to '1' (Bienes) if not specified
        const indicardor = item.goodServiceIndicator || (item.isTaxExempt ? '2' : '1');
        // Better logic: if we don't know, assume Good unless taxExempt might imply Service? No.
        // But we added the field to InvoiceItem, so we use it. 
        // Fallback: '1'

        return `
        <Item>
            <NumeroLinea>${index + 1}</NumeroLinea>
            <IndicadorFacturacion>1</IndicadorFacturacion>
            <NombreItem>${item.productName}</NombreItem>
            <IndicadorBienoServicio>${item.goodServiceIndicator || '1'}</IndicadorBienoServicio> 
            <CantidadItem>${item.quantity}</CantidadItem>
            <PrecioUnitarioItem>${item.unitPrice.toFixed(2)}</PrecioUnitarioItem>
            <DescuentoMonto>${discountAmount.toFixed(2)}</DescuentoMonto>
            <MontoItem>${itemTotal.toFixed(2)}</MontoItem>
        </Item>`;
    }).join('')}
    </DetallesItems>
    <FechaHoraFirma>${formatDateTime(new Date())}</FechaHoraFirma>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
            <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
            <Reference URI="">
                <Transforms>
                    <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
                </Transforms>
                <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
                <DigestValue></DigestValue>
            </Reference>
        </SignedInfo>
        <SignatureValue></SignatureValue>
    </Signature>
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
