import { prisma } from "@/prisma/lib/dbcontext";
import bcrypt from "bcrypt";
import { invoices, customers, revenue, users } from "@/app/lib/placeholder-data";

async function main() {
    await Promise.all(
        users.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await prisma.user.create({
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    password: hashedPassword
                }
            })
        })
    )

    await Promise.all(
        customers.map(async (customer) => {
            await prisma.customer.create({
                data: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    imageUrl: customer.image_url
                }
            })
        })
    )

    await Promise.all(
        invoices.map(async (invoice) => {
            await prisma.invoices.create({
                data: {
                    customerId: invoice.customer_id,
                    amount: invoice.amount,
                    status: invoice.status,
                    date: invoice.date
                }
            })
        })
    )

    await Promise.all(
        revenue.map(async (rev) => {
            await prisma.revenue.create({
                data: {
                    month: rev.month,
                    revenue: rev.revenue
                }
            })
        })
    )
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    })