import { useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'

const OrgPage = () => {
	type FormValues = {
		orgName: string
		gstin: string
		pan: string
		firstName: string
		lastName: string
		email: string
		password: string
		employeeCode: string
	}

	const { register, handleSubmit } = useForm<FormValues>({
		defaultValues: {
			orgName: '',
			gstin: '',
			pan: '',
			firstName: '',
			lastName: '',
			email: '',
			password: '',
			employeeCode: '',
		},
	})

	const onSubmit = (data: FormValues) => {
		console.log(data)
	}

	return (
		<Layout>
			<AdminLayout>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold">Organization</h1>
				</div>

				<div className="bg-gray-100 rounded-md p-4 mb-6">
					<p className="text-sm text-gray-600">Manage organization details and settings.</p>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-white rounded shadow space-y-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="orgName">Organization Name *</Label>
							<Input id="orgName" placeholder="Enter your organization name" {...register('orgName')} />
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="gstin">GSTIN</Label>
								<Input id="gstin" placeholder="Enter GSTIN (optional)" {...register('gstin')} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="pan">PAN</Label>
								<Input id="pan" placeholder="Enter PAN (optional)" {...register('pan')} />
							</div>
						</div>
					</div>

					<div className="pt-4 border-t">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-green-100 rounded-lg">
								<svg className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 4 4 .5-3 3 .7 4L12 13l-3.7 1.5.7-4L5 6.5 9 6 11 2z" /></svg>
							</div>
							<div>
								<h2 className="text-lg font-semibold">Admin User Details</h2>
								<p className="text-sm text-muted-foreground">Set up your admin account</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="firstName">First Name *</Label>
								<Input id="firstName" placeholder="Enter first name" {...register('firstName')} />
							</div>

							<div className="space-y-2">
								<Label htmlFor="lastName">Last Name *</Label>
								<Input id="lastName" placeholder="Enter last name" {...register('lastName')} />
							</div>

							<div className="col-span-2 space-y-2">
								<Label htmlFor="email">Email Address *</Label>
								<Input id="email" type="email" placeholder="Enter admin email address" {...register('email')} />
							</div>
							<div className="col-span-2 space-y-2">
								<Label htmlFor="employeeCode">Employee Code *</Label>
								<Input id="employeeCode" placeholder="Enter employee code" {...register('employeeCode')} />
							</div>
						</div>

						<div className="mt-6">
							<Button type="submit" className="w-2/12 mx-auto block">Create Organization</Button>
						</div>
					</div>
				</form>
			</AdminLayout>
		</Layout>
	)
}

export default OrgPage
