import { prisma } from "@/prisma/lib/dbcontext";

async function listInvoices() {
  const data = await prisma.invoices.findMany({
    where: {
      amount: 666
    },
    select: {
      amount: true,
      Customer: {
        select: {
          name: true
        }
      }
    }
  })

  // EXEMPLE D'UTILISATEUR D'UNE JOINTURE
  // const invoices = await prisma.invoices.findMany({
  //  include: {
  //    Customer: true  
  //  }
  // })
  // invoices.forEach( invoice => {
  //   console.log(invoice.Customer.name);
  // })

  // EXEMPLE DE FORMATAGE POUR UN RESULTAT SPECIFIQUE DTO
  // const data = await prisma.invoices.findMany({
  //   where: {
  //     amount: 666
  //   },
  //   include: {
  //     Customer: true
  //   }
  // });

  // const result = data.map(invoice => ({
  //   amount: invoice.amount,
  //   name: invoice.Customer.name,
  // }))

  return data;
}

export async function GET() {
  try {
    return Response.json(await listInvoices());
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}